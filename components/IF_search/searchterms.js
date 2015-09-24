var stopwords = require('./stopwords');
var fs = require('fs');
var natural = require('natural');


/**
 * Takes a list of words, remomves the stop words, returns array
 */
var tokenizer = new natural.WordTokenizer();
var tokenize = module.exports.tokenize = function(text) {
  var tokens = [];
  tokenizer.tokenize(text).map(function(token) {
    if (stopwords.indexOf(token) === -1) {
      tokens.push(natural.PorterStemmer.stem(token.toLowerCase()));
    }
  })
  return tokens;
}


/**
 * Get the list of colors and color values
 */
var rgbtxt = fs.readFileSync(__dirname + '/rgb.txt', 'utf8').split('\n').slice(1);
var colormap = module.exports.colormap = {};
var colors = module.exports.colors = rgbtxt.map(function(line) {
  line = line.split('\t');
  if (line[0] && line[1]) {
    colormap[line[0]] = line[1];
    return line[0];
  }
})


/**
 * Get the words from teh spreadsheet
 *
 * buckets: [{
 *  name: 'item',
 *  boost: 50,
 *  words: ['jacket', 'skiboots', etc]
 * }]
 */
var tsvfile = fs.readFileSync(__dirname + '/List of Tags in Kip Search - category terms.tsv',  'utf8').split('\r\n');
var buckets = module.exports.buckets = tsvfile.slice(1).map(function(row) {
  row = row.split('\t').filter(function(val) {
    return val !== '';
  });
  return {
    name: row[0].toLowerCase().replace(/ /g, ''),
    boost: row[1], //default, should often be overridden by our combos
    words: tokenize(row.slice(2).join(' '))
  }
});

// some custom logic for combining "major item" and "minor item" buckets
var itembucket = buckets.reduce(function(bucket, b) {
  if (b.name.indexOf('item') >= 0) {
    bucket.words = bucket.words.concat(b.words);
  }
  return bucket;
}, {name: 'item', boost: 50, words: []})
buckets = buckets.filter(function(b) {
  return b.name.indexOf('item') < 0;
})
buckets.push(itembucket);

// also add the colors
buckets.push({
  name: 'colors',
  boost: 30,
  words: tokenize(colors.join(' '))
})

// make a bucket hash instead of array.
bucketHash = buckets.reduce(function(h, b) {
  h[b.name] = b;
  return h;
}, {})

// make sure there are no genders in the brand bucket
bucketHash.brand.words = bucketHash.brand.words.filter(function (word) {
  return bucketHash.gender.words.indexOf(word) < 0;
})

// make sure there are no items in the pop culture bucket
bucketHash.popculture.words = bucketHash.popculture.words.filter(function (word) {
  return bucketHash.item.words.indexOf(word) < 0;
})

// colors are actually the worst
bucketHash.colors.words = bucketHash.colors.words.filter(function(word) {
  var ok = true;
  buckets.map(function(b) {
    if (b.name == 'colors') { return; }
    if (b.words.indexOf(word) >= 0) {
      ok = false;
    }
  })
  return ok;
})

/**
 * Get the combos from the spreadsheet
 * will look like this: {
 *  'gender__item': [{name: 'item': boost: 71}, {name: 'gender', boost: 29}]
 * }
 */
var comboTsv = fs.readFileSync(__dirname + '/List of Tags in Kip Search - custom weights.tsv', 'utf8')
  .split('\r\n')
  .map(function(row) {
    return row
      .split('\t')
      .filter(function(data) {
        return data !== ''
      })
  })
var combos = module.exports.combos = {};

// two-term combos
var twoTermCombosFirstValue = comboTsv[3][0];
var twoTermCombosSecondValue = comboTsv[4][0];
for (var i = 1; i < comboTsv[3].length; i++) {
  var key = [comboTsv[3][i], comboTsv[4][i]].sort().join('|').replace(/ /g, '');
  combos[key] = [{
      name: comboTsv[3][i].replace(/ /g, ''),
      boost: twoTermCombosFirstValue
    }, {
      name: comboTsv[4][i].replace(/ /g, ''),
      boost: twoTermCombosSecondValue
    }];
}

// three-term combos
var threeTermCombosFirstValue = comboTsv[7][0];
var threeTermCombosSecondValue = comboTsv[8][0];
var threeTermCombosThirdValue = comboTsv[9][0];
for (var i = 1; i < comboTsv[8].length; i++) {
  var key = [comboTsv[7][i], comboTsv[8][i], comboTsv[9][i]].sort().join('|').replace(/ /g, '');
  combos[key] = [{
      name: comboTsv[7][i].replace(/ /g, ''),
      boost: threeTermCombosFirstValue
    }, {
      name: comboTsv[8][i].replace(/ /g, ''),
      boost: threeTermCombosSecondValue
    }, {
      name: comboTsv[9][i].replace(/ /g, ''),
      boost: threeTermCombosThirdValue
    }];
}


/**
 * Takes a list of words, remomves the stop words, and splits the remaining
 * words into fashion buckets.
 * buckets = {
 *  'item': {
 *    words: ['sweatshirt', 'sweats']
 *    boost: 50
 *  }
 * }
 */
var parse = module.exports.parse = function(terms) {
  var tokens = tokenize(terms);

  var combo = [];
  var bucketTerms = tokens.reduce(function (bucketTerms, t) {
    var categorized = false;
    buckets.map(function(bucket) {
      if (bucket.words.indexOf(t) >= 0) {
        // init this bucket if necessary
        if (!bucketTerms[bucket.name]) {
          bucketTerms[bucket.name] = {
            words: [],
            boost: bucket.boost
          }
        }
        bucketTerms[bucket.name].words.push(t);
        categorized = true;
        combo.push(bucket.name);
      }
    })
    if (!categorized) {
      bucketTerms.uncategorized.words.push(t);
      combo.push('uncategorized');
    }
    return bucketTerms;
  }, {'uncategorized': {words: [], boost: 0}});

  if (bucketTerms.uncategorized.words.length === 0) {
    delete bucketTerms.uncategorized;
  }

  // check to see if we need to apply custom weights for a SECRET COMBO
  // up up down down left right left right b a
  if (combos[combo.sort().join('|')]) {
    combos[combo.sort().join('|')].map(function(bucket) {
      bucketTerms[bucket.name].boost = bucket.boost;
    })
  }

  return bucketTerms;

}

/**
 * Turns a bunch of bucketd terms into an elasticsearch query
 */
var getElasticsearchQuery = module.exports.getElasticsearchQuery = function (text) {

  var bucketTerms = parse(text);
  console.log(bucketTerms);

  var matches = Object.keys(bucketTerms).map(function(bucketName) {
    //if (bucketName === 'uncategorized') return; // uncategorized handled differently
    var terms = bucketTerms[bucketName].words;
    return {
      multi_match: {
          query: terms.join(' '),
          fields: ['tags^10', 'name^4', 'fullText'],
          boost: bucketTerms[bucketName].boost
      }
    }
  });

  var query = {
      bool: {
        should: matches
      }
  };

  return query;
}
