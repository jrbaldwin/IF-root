const getSlackHistogram = (messages) =>
  new Promise((resolve, reject) => {
    messages.aggregate([
      {
        $match: {
          ts: {
            $gte: new Date(new Date().setDate(new Date().getDate()-1))
          },
          incoming: {$ne: false}
        }
      },
      {
        $group: {
          _id: {
            hour: {$subtract: [{ $divide: [{$subtract: [new Date(),"$ts"]}, 1000*60*60] }, {$mod: [{ $divide: [{$subtract: [new Date(),"$ts"]}, 1000*60*60] },1]}]},
            prov: '$source.origin',
          },
          count: { $sum: 1 },
        },
      },
      { 
        $group: {
          _id: {
            hour: '$_id.hour',
          },
          sources: {
            $addToSet: {
              source: '$_id.prov',
              num: '$count',
            },
          },
        },
      },
      {
        $sort: {'_id.hour': 1}
      },
    ], (err, result) => {
      if (err) { reject(err); }
      const hours = result.map(hour => {
        const sources = hour.sources.filter(source => source.source);
        const total = hour.sources.reduce((prevSource, source) =>
          ({ num: prevSource.num + source.num })).num;

        return {
          hour: hour._id.hour,
          total,
        };
      });
      resolve(hours);
    });
  });

module.exports = getSlackHistogram;
if (!module.parent) {
  require('../../../kip')
  console.log('Histogram that shows how many messages have been sent in the recent hours of the past day')
  console.log('Hour: 0 means "in the last hour", hour: 1 is "one hour ago" etc')
  getSlackHistogram(db.messages).then(console.log.bind(console))
}