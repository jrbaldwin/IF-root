var app = angular.module('app', []);

app.controller('menuController', function ($scope, $window, MenuFactory) {
  $scope.menu = MenuFactory.getMenu();
  $scope.name = MenuFactory.getRestaurant();
  $scope.minimum = MenuFactory.getMinimum();
  $scope.total = 0;
  $scope.cart = [];
  $scope.inProgress = {};
  $scope.categories = {};
  $scope.options = {};

  $scope.toggleCategory = function (cat) {
    if ($scope.categories[cat]) $scope.categories[cat] = false;
    else $scope.categories[cat] = true;
  };

  $scope.itemDetails = function (item) {
    if ($scope.inProgress[item.id]) {
      item.current_price = null;
      $scope.inProgress[item.id] = null;
    }
    else {
      var details = {item_qty: 1, max_qty: item.max_qty, name: item.name, id: item.unique_id, price: item.price, options: {}};
      for (var child in item.children) {
        details.options[item.children[child].name] = {};
        var opt = item.children[child];
        // console.log('OPT TYPE', opt.type)
        if (opt.type == "price group") {
          item.price = 0;
          details.price = 0;
        }
        for (var s in opt.children) {
          var selection = opt.children[s];
          details.options[item.children[child].name][opt.children[s].unique_id] = {
            chosen: false,
            price: selection.price,
            name: selection.name
          };
        }
      }
      console.log('in progress:', details)
      $scope.inProgress[item.id] = details;
    }
  };

  $scope.formatPrice = function (price) {
    //console.log('price', price)
    return (price !== 0 ? " + " + price : "");
  };

  $scope.validateItem = function (item) {
    //not actually counting the number of selected options

    //correctly returning true and false
    var validateRadio = function (option) {
      var radio = $scope.inProgress[item.id].options[option];
      if (Object.keys(radio).indexOf('radio') >= 0) return true;
      else return false;
    };

    var validateCheck = function (min, max, opGroup) {
      var ipOpGroup = $scope.inProgress[item.id].options[opGroup.name];
      var count = 0;
      for (var k in ipOpGroup) {
        var op = ipOpGroup[k];
        //console.log('should have a chosen property', op)
        if (op.chosen) count++;
      }
      //console.log(min, count, max)
      //console.log('validate check -->', (!count < min || count > max) )
      if (count < min || count > max) return false;
      else return true;
    }

    var valid = true;

    for (var i = 0; i < item.children.length; i++) {
      var opGroup = item.children[i];
      if (opGroup.min_selection == 1 && opGroup.max_selection == 1) {
          valid &= validateRadio(opGroup.name);
      }
      else {
        valid &= validateCheck(opGroup.min_selection, opGroup.max_selection, opGroup);
      }
      // console.log('valid:', valid)
    }

    return valid;
  };

//used for displaying price
  $scope.addRadioPrice = function (og, price, item) {
    if (!item.current_price) item.current_price = 0;
    if (!item[`${og.name}_price`]) item[`${og.name}_price`] = 0;
    var prevOgPrice = item[`${og.name}_price`];
    item[`${og.name}_price`] = price;
    //console.log(prevOgPrice, 'prevOgPrice', '////', 'price', price);
    item.current_price -= prevOgPrice;
    item.current_price += price;
  }

//used for displaying price
  $scope.addOptionPrice = function (flag, price, item) {
    if (!item.current_price) item.current_price = 0;
  //  var prev = item.current_price;
    if (flag) {
      item.current_price += price;
    }
    else item.current_price -= price;
    //console.log(prev, 'prev', '///', 'cp', item.current_price)
  }

  $scope.addToCart = function (item) {
    console.log('ITEM', item);
    var foodItem = $scope.inProgress[item.id];
    if (foodItem.item_qty > item.max_qty) foodItem.item_qty = item.max_qty;
    for (var k in foodItem.options) {
      opGroup = foodItem.options[k];
      if (Object.keys(opGroup).indexOf('radio') > -1) {
        var selectionId = opGroup.radio;
        opGroup[selectionId].chosen = true;
      }
      for (var key in opGroup) {
        if (opGroup[key].chosen) {
          if ($scope.options[item.unique_id]) $scope.options[item.unique_id].push([opGroup[key].name, opGroup[key].price]);
          else $scope.options[item.unique_id] = [[opGroup[key].name, opGroup[key].price]];
        }
      }
    }
    console.log($scope.cart, 'cart');

    $scope.inProgress[item.id].instructions = window.prompt("Do you have any special instructions?");
    $scope.inProgress[item.id].price += (item.current_price ? item.current_price : 0)
    $scope.cart.push($scope.inProgress[item.id]);
    $scope.total += ($scope.inProgress[item.id].price * $scope.inProgress[item.id].item_qty);
    $scope.inProgress[item.id] = null;
  };

  $scope.changeQuantity = function (item_id, diff) {
    for (var i = 0; i < $scope.cart.length; i++) {
      if ($scope.cart[i].id == item_id) {
        $scope.cart[i].item_qty = Number($scope.cart[i].item_qty);
        //you're deleting the order
        if (diff + $scope.cart[i].item_qty <= 0) {
          if (! window.confirm("Are you sure you want to delete this item from your cart?")) {
            return null;
          }
          $scope.total -= $scope.cart[i].price;
          $scope.cart.splice(i, 1);

          console.log($scope.cart);
        }
        //you've surpassed the order maximum
        else if ($scope.cart[i].item_qty + diff > $scope.cart[i].max_qty) {
          return;
        }
        else {
          $scope.cart[i].item_qty += diff;
          $scope.total += diff * $scope.cart[i].price;
        }
      }
    }
  };

  $scope.checkout = function () {
    MenuFactory.submitOrder(MenuFactory.formatCart($scope.cart));
    window.close();
  };
});