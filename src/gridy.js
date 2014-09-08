'use strict';

var IScroll = IScroll || {};
var interact = interact || {};
var eventjs = eventjs || {};

function collide(a, b) {
  if (a.col > b.col + b.cols - 1 || b.col > a.col + a.cols - 1) {
    return false;
  }

  if (a.row > b.row + b.rows -1 || b.row > a.row + a.rows - 1) {
    return false;
  }

  return true;
}

if(!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

var __id = 0;

angular

.module('rutkoski.angular-gridy', [])

.constant('gridyConfig', {
  margin : 10,
  gutter : 10,
  maxRows : 2,
  maxCols : 3,
  mobileBreak : 480,
  dragHandle : '.gridy-drag-handle',
  resizeHandle : '.gridy-resize-handle'
})

.controller('GridyCtrl', ['gridyConfig', function(gridyConfig){

  this.maxCols = null;
  this.maxRows = null;
  this.gutter = null;
  this.margin = null;
  this.mobileBreak = null;

  this.$element = null;
  this.$inner = null;

  this.floating = true;
  this.mobile = false;
  this.scrollbarWidth = 16;
  this.colWidth = null;
  this.rowHeight = null;
  this.pageWidth = null;
  this.pageHeight = null;

  this.grid = [];
  this.dragItem = null;
  this.interacting = false;
  this.maxCol = -1;

  this.page = 0;

  angular.extend(this, gridyConfig);

  this.setOptions = function(options) {
    if (!options) {
      return;
    }

    options = angular.extend({}, options);

    angular.extend(this, options);
  };

  this.init = function($element) {
    this.$element = $element;
    this.$inner = $element.find('.gridy-inner');
  };

  this.removeItem = function(item) {
    if (this.grid[item.row] && this.grid[item.row][item.col] === item) {
      delete this.grid[item.row][item.col];
    }

    this.floatItems();
  };

  this.autoSetItemPosition = function(item) {
    var pos = { row : 0, col : 0, rows : item.rows, cols : item.cols };

    while (this.getItems(pos).length || ! this.isInsidePage(pos)) {
      pos.row = pos.row + 1;

      if (pos.row >= this.maxRows) {
        pos.row = 0;
        pos.col = pos.col + 1;
      }
    }

    this.setItemPosition(item, pos.row, pos.col);
  };

  this.isInsidePage = function(item) {
    var page0 = this.getPageFromCol(item.col), page1 = this.getPageFromCol(item.col + item.cols - 1);
    return page0 === page1;
  };

  this.setItemPosition = function(item, row, col) {
    if (this.mobile) {
      return;
    }

    if (typeof item.oldRow !== 'undefined' && item.oldRow === row && typeof item.oldCol !== 'undefined' && item.oldCol === col) {
      return;
    }

    if (this.grid[item.oldRow] && this.grid[item.oldRow][item.oldCol] === item) {
      delete this.grid[item.oldRow][item.oldCol];
    }

    if (isNaN(parseInt(row)) || isNaN(parseInt(col))) {
      this.autoSetItemPosition(item);
      return;
    }

    item.oldRow = item.row = row;
    item.oldCol = item.col = col;

    var jump = this.getItems(item, item);

    this.moveOverlappingItems(item);

    if (!this.grid[row]) {
      this.grid[row] = [];
    }

    this.grid[row][col] = item;

    this.updateMaxCol();

    if (item === this.dragItem) {
      while (jump.length) {
        this.jumpFloatItem(jump.shift());
      }
    }
  };

  this.setItemSize = function(item, rows, cols) {
    if (this.mobile) {
      return;
    }

    if (!parseInt(cols)) {
      item.cols = 1;
    }

    if (!parseInt(rows)) {
      item.rows = 1;
    }

    var page0 = this.getPageFromCol(item.col), page1 = this.getPageFromCol(item.col + cols - 1);
    if (page0 !== page1) {
      cols = this.maxCols - (item.col - page0 * this.maxCols);
    }

    item.rows = rows;
    item.cols = cols;

    this.moveOverlappingItems(item);

    this.updateMaxCol();
  };

  this.floatItems = function(exclude) {
    if (this.mobile) {
      return;
    }

    if (! this.floating) {
      return;
    }

    if (exclude && !Array.isArray(exclude)) {
      exclude = [exclude];
    }

    this.gridWalk(function(_item) {
      if (_item !== this.dragItem && (!exclude || exclude.indexOf(_item) === -1)) {
        this.floatItem(_item, exclude);
      }
    }, this);
  };

  this.jumpFloatItem = function(item) {
    if (this.mobile) {
      return;
    }

    if (! item.floating) {
      return;
    }

    var j = item.col, pos, m;

    pos = { row: item.row, col: item.col, rows: item.rows, cols: item.cols };

    while (j >= 0) {
      pos.col = j;

      if (!this.getItems(pos, item).length) {
        m = j;
      }

      j--;
    }

    if (m !== item.col) {
      this.setItemPosition(item, item.row, m);
    }
  };

  this.floatItem = function(item) {
    if (this.mobile) {
      return;
    }

    if (! item.floating) {
      return;
    }

    var j = item.col, _item, items, pos;

    pos = { row: item.row, col: item.col, rows: item.rows, cols: item.cols };

    while (j > 0) {
      pos.col = j - 1;

      items = this.getItems(pos, item);

      if (items.length) {
        j = 0;
        while (items.length) {
          _item = items.pop();
          j = Math.max(j, _item.col + _item.cols);

          var page0 = this.getPageFromCol(j), page1 = this.getPageFromCol(j + item.cols - 1);

          if (page1 > page0) {
            j = this.maxCols * page1;
          }
        }

        break;
      }

      j--;
    }

    if (j !== item.col) {
      this.setItemPosition(item, item.row, j);
    }
  };

  this.moveOverlappingItems = function(item) {
    if (this.mobile) {
      return;
    }

    var items = this.getItems(item, item);

    while (items.length) {
      var page0, page1;
      var _item = items.shift();
      var col = item.col + item.cols;
      do {
        page0 = this.getPageFromCol(col);
        page1 = this.getPageFromCol(col + _item.cols - 1);

        this.setItemPosition(_item, _item.row, col);

        col++;
      } while (page0 !== page1);
    }
  };

  this.getItems = function(item, exclude) {
    var items = [];

    if (exclude && !Array.isArray(exclude)) {
      exclude = [exclude];
    }

    this.gridWalk(function(_item) {
      if ((!exclude || exclude.indexOf(_item) === -1) && collide(item, _item)) {
        items.push(_item);
      }
    });

    return items;
  };

  this.findClosestPosition = function(x, y) {
    var row, col;

    var page = this.getPage(x),
        relativeX = x - this.getPageOffset(page) - this.margin,
        relativeY = y - this.margin;

    row = Math.floor((relativeY - this.margin) / (this.rowHeight + this.gutter));
    col = Math.floor((relativeX - this.margin) / (this.colWidth + this.gutter));

    var left = this.getX(col), right = this.getX(col + 1),
        top = this.getY(row), bottom = this.getY(row + 1);

    row = y - top < bottom - y ? row : row + 1;
    col = x - left < right - x ? col : col + 1;

    col += page * this.maxCols;

    return { row: row, col: col };
  };

  this.gridWalk = function(callback, self) {
    var i, j, row, item;

    for (i in this.grid) {
      row = this.grid[i];
      for (j in row) {
        item = row[j];
        callback.apply(self, [ item, i, j ]);
      }
    }
  };

  this.getPage = function(x) {
    return Math.floor(x / this.pageWidth);
  };

  this.getPageFromCol = function(col) {
    return Math.floor(col / this.maxCols);
  };

  this.getPageOffset = function(page) {
    return page * this.pageWidth;
  };

  this.getX = function(col) {
    var page = this.getPageFromCol(col),
        pageOffset = this.getPageOffset(page),
        relativeCol = col - this.maxCols * page;
    return Math.round(pageOffset + this.margin + relativeCol * this.colWidth + relativeCol * this.gutter);
  };

  this.getY = function(row) {
    return Math.round(this.margin + row * this.rowHeight + row * this.gutter);
  };

  this.updateMaxCol = function() {
    var maxCol = 0;
    this.gridWalk(function(item) { maxCol = Math.max(maxCol, item.col + item.cols - 1); });
    this.maxCol = maxCol;
  };

  this.getInnerWidth = function() {
    if (this.mobile) {
      return this.$element.find('.gridy-item').size() * this.pageWidth;
    }

    return this.getPageOffset(this.getPageFromCol(this.maxCol) + 1);
  };

}])

.controller('GridyItemCtrl', [function(){

  this.$element = null;
  this.gridy = null;
  this.col = null;
  this.row = null;
  this.cols = null;
  this.rows = null;
  this.floating = false;
  this.resizing = false;
  this.dragging = false;
  this.selected = false;

  this.init = function($element, gridy) {
    this.$element = $element;
    this.gridy = gridy;
  };

  this.configure = function(options) {
    this.col = options.col;
    this.row = options.row;
    this.cols = options.cols;
    this.rows = options.rows;
  };

  this.getIndex = function() {
    return this.$element.parents('.gridy').find('.gridy-item').index(this.$element);
  };

  this.getLeft = function() {
    return this.gridy.getX(this.gridy.mobile ? this.getIndex() * this.gridy.maxCols : this.col);
  };

  this.getTop = function() {
    return this.gridy.getY(this.gridy.mobile ? 0 : this.row);
  };

  this.getWidth = function() {
    return Math.round(this.gridy.mobile ? this.gridy.colWidth : this.cols * this.gridy.colWidth + (this.cols - 1) * this.gridy.gutter);
  };

  this.getHeight = function() {
    return Math.round(this.gridy.mobile ? this.gridy.rowHeight : this.rows * this.gridy.rowHeight + (this.rows - 1) * this.gridy.gutter);
  };

  this.setPosition = function(row, col) {
    this.gridy.setItemPosition(this, row, col);
    this.gridy.floatItems();
  };

  this.setSize = function(rows, cols) {
    this.gridy.setItemSize(this, rows, cols);
    this.gridy.floatItems();
  };

}])

.directive('gridy', ['$window', '$timeout', function($window, $timeout) {
  return {
    restrict: 'A',
    controller: 'GridyCtrl',
    controllerAs: 'gridy',
    transclude: true,
    replace: true,
    template: '<div class="gridy" ng-class="gridyClass()"><div class="gridy-inner" ng-style="innerStyle()"><div class="gridy-placeholder" ng-style="placeholderStyle()" ng-show="placeholderVisible()"></div><div ng-transclude></div></div></div>',
    scope: {
      config: '=?gridy'
    },
    compile: function() {

      return function(scope, $element, attrs, gridy) {

        var $win = angular.element($window);
        var scrollWatchInterval = null, goToPageTimeout = null, scrollOffsetX = 0;

        gridy.init($element);

        var refresh = function() {
          gridy.setOptions(scope.config);
        };

        scope.$watch('config', refresh, true);

        document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);

        function onResize() {
          $timeout(function() {
            if ($win.width() < gridy.mobileBreak) {
              if (!gridy.mobile) {
                gridy.mobile = true;
              }
            }
            else if (gridy.mobile) {
              gridy.mobile = false;
            }

            gridy.pageWidth = $element.width();
            gridy.pageHeight = $element.height();
            gridy.colWidth = gridy.mobile ? gridy.pageWidth - gridy.margin - gridy.margin : (gridy.pageWidth - gridy.margin - gridy.margin - gridy.gutter * (gridy.maxCols - 1)) / gridy.maxCols;
            gridy.rowHeight = gridy.mobile ? gridy.pageHeight - gridy.margin - gridy.margin - gridy.scrollbarWidth : (gridy.pageHeight - gridy.margin - gridy.margin - gridy.scrollbarWidth - gridy.gutter * (gridy.maxRows - 1)) / gridy.maxRows;
          });
        }

        $win.on('resize', onResize);

        onResize();

        function delayedGoToPage(page) {
          if (! goToPageTimeout) {
            goToPageTimeout = setTimeout(function() {
              cancelDelayedGoToPage();
              goToPage(page);
            }, 2000);
          }
        }

        function cancelDelayedGoToPage() {
          if (goToPageTimeout) {
            goToPageTimeout = clearTimeout(goToPageTimeout);
          }
        }

        function scrollWatch() {
          var item = gridy.dragItem;

          if (! item) {
            return;
          }

          if (gridy.getPageFromCol(item.col) < gridy.page) {
            delayedGoToPage(gridy.page - 1);
          } else if (gridy.getPageFromCol(item.col + item.cols - 1) > gridy.page) {
            delayedGoToPage(gridy.page + 1);
          } else {
            cancelDelayedGoToPage();
          }
        }

        function goToPage(page) {
          $timeout(function() {
            gridy.page = page;
          });
        }

        scope.gridyClass = function() {
          return {
            'gridy-locked' : gridy.mobile,
            'gridy-interacting' : gridy.interacting
          };
        };

        scope.$watch(function() {
          return gridy.interacting;
        }, function() {
          if (gridy.interacting) {
            iscroll.disable();

            if (! scrollWatchInterval) {
              scrollWatchInterval = setInterval(scrollWatch, 100);
            }
          } else {
            if (scrollWatchInterval) {
              scrollWatchInterval = clearInterval(scrollWatchInterval);
            }

            iscroll.enable();

            if (iscrollEvent) {
              iscroll.handleEvent(iscrollEvent);
            }
          }
        });

        scope.$watch(function() {
          return gridy.page;
        }, function() {
          scrollOffsetX = - iscroll.x;
          iscroll.goToPage(gridy.page, 0, 1000);
        });

        scope.$watch(function() {
          return gridy.maxCol;
        }, function() {
          iscroll.refresh();
        });

        scope.innerStyle = function() {
          return {
            width: gridy.getInnerWidth(),
            height: gridy.pageHeight
          };
        };

        scope.placeholderVisible = function() {
          return gridy.dragItem;
        };

        scope.placeholderStyle = function() {
          return {
            top    : gridy.dragItem ? gridy.dragItem.getTop() : 0,
            left   : gridy.dragItem ? gridy.dragItem.getLeft() : 0,
            width  : gridy.dragItem ? gridy.dragItem.getWidth() : 0,
            height : gridy.dragItem ? gridy.dragItem.getHeight() : 0
          };
        };

        var iscroll = new IScroll($element[0], {
          scrollX : true,
          scrollY : false,
          snap : true,
          scrollbars : true,
          shrinkScrollbars : 'scale',
          momentum : false,
          probeType: 3
        });

        var iscrollEvent = null;
        iscroll.oldHandleEvent = iscroll.handleEvent;
        iscroll.handleEvent = function (e) {
          switch ( e.type ) {
            case 'touchend':
            case 'pointerup':
            case 'MSPointerUp':
            case 'mouseup':
            case 'touchcancel':
            case 'pointercancel':
            case 'MSPointerCancel':
            case 'mousecancel':
              iscrollEvent = e;
              break;
          }

          iscroll.oldHandleEvent.apply(iscroll, [e]);
        }

        iscroll.on('scroll', function() {
          if (gridy.dragItem) {
            var dx = - iscroll.x - scrollOffsetX;

            scrollOffsetX = - iscroll.x;

            var $el = gridy.dragItem.$element[0];

            $el.style.left = (parseFloat($el.style.left) + dx) + 'px';
          }
        });

        iscroll.on('scrollEnd', function() {
          scope.$apply(function() {
            gridy.page = Math.max(0, Math.floor(iscroll.x / gridy.pageWidth * -1));
          });
        });

      };

    }
  };
}])

.directive('gridyItem', ['$parse', '$timeout', function($parse, $timeout) {
  return {
    restrict: 'A',
    replace: true,
    transclude: 'true',
    template: '<div ng-class="itemClass()" ng-style="itemStyle()" ng-transclude></div>',
    require: ['^gridy', 'gridyItem'],
    controller: 'GridyItemCtrl',
    link: function(scope, $element, attrs, controllers) {

      var gridy = controllers[0], item = controllers[1];
      var optionsKey = attrs.gridyItem, options;

      if (optionsKey) {
        var $optionsGetter = $parse(optionsKey);
        options = $optionsGetter(scope) || {};
        if (!options && $optionsGetter.assign) {
          options = {
            col: item.col,
            cols: item.cols,
            row: item.row,
            rows: item.rows
          };
          $optionsGetter.assign(scope, options);
        }
      } else {
        options = attrs;
      }

      item.init($element, gridy);
      item.configure(options);
      item._id = 'item_' + __id++;

      var aspects = ['row', 'col', 'rows', 'cols'],
          $getters = {};

      var aspectFn = function(aspect) {
        var key;
        if (typeof options[aspect] === 'string') {
          key = options[aspect];
        } else if (typeof options[aspect.toLowerCase()] === 'string') {
          key = options[aspect.toLowerCase()];
        } else if (optionsKey) {
          key = $parse(optionsKey + '.' + aspect);
        } else {
          return;
        }
        $getters[aspect] = $parse(key);

        // when the value changes externally, update the internal item object
        scope.$watch(key, function(newVal) {
          newVal = parseInt(newVal, 10);
          if (!isNaN(newVal)) {
            item[aspect] = newVal;
          }
        });

        // initial set
        var val = $getters[aspect](scope);
        if (typeof val === 'number') {
          item[aspect] = val;
        }
      };

      for (var i = 0, l = aspects.length; i < l; ++i) {
        aspectFn(aspects[i]);
      }

      scope.itemStyle = function() {
        return {
          top : item.getTop(),
          left : item.getLeft(),
          width : item.getWidth(),
          height : item.getHeight()
        };
      };

      scope.$watch(function() {
        return $element.innerHeight();
      }, function() {
        scope.itemHeight = $element.innerHeight();
      });

      scope.itemClass = function() {
        return {
          'gridy-item' : true,
          'gridy-item-dragging' : item.dragging,
          'gridy-item-resizing' : item.resizing,
          'gridy-item-selected' : item.selected
        };
      };

      var oldProps = {};

      var interactable = interact($element[0])
        .draggable({
          onstart: function() {
            scope.$apply(function() {
              gridy.dragItem = item;

              oldProps.row = item.row;
              oldProps.col = item.col;
              oldProps.rows = item.rows;
              oldProps.cols = item.cols;
            });
          },
          onmove: function(event) {
            var x = parseFloat(event.target.style.left) + event.dx;
            var y = parseFloat(event.target.style.top) + event.dy;

            x = Math.max(x, gridy.margin);
            y = Math.max(y, gridy.margin);
            y = Math.min(y, gridy.pageHeight - gridy.margin - gridy.scrollbarWidth - parseFloat(event.target.style.height));

            var pos = gridy.findClosestPosition(x, y);

            if (item.row !== pos.row || item.col !== pos.col) {
              scope.$apply(function() {
                item.row = pos.row;
                item.col = pos.col;
              });
            }

            event.target.style.left = x + 'px';
            event.target.style.top = y + 'px';
          },
          onend: function(event) {
            scope.$apply(function() {
              gridy.dragItem = null;
              gridy.floatItems();
            });

            event.target.style.top = item.getTop() + 'px';
            event.target.style.left = item.getLeft() + 'px';

            if (oldProps.row !== item.row || oldProps.col !== item.col || oldProps.rows !== item.rows || oldProps.cols !== item.cols) {
              scope.$emit('gridy-change');
            }
          }
        })
        .resizable({
          onstart: function() {
            scope.$apply(function() {
              gridy.dragItem = item;

              oldProps.row = item.row;
              oldProps.col = item.col;
              oldProps.rows = item.rows;
              oldProps.cols = item.cols;
            });
          },
          onmove: function (event) {
            var x = parseFloat(event.target.style.left) + parseFloat(event.target.style.width) + event.dx;
            var y = parseFloat(event.target.style.top) + parseFloat(event.target.style.height) + event.dy;

            var page = gridy.getPageFromCol(item.col),
                pageOffset = gridy.pageWidth * page;

            x = Math.min(x, pageOffset + gridy.pageWidth - gridy.margin);
            y = Math.min(y, gridy.pageHeight - gridy.margin - gridy.scrollbarWidth);

            var pos = gridy.findClosestPosition(x, y);

            pos.rows = Math.max(pos.row - item.row, 1);
            pos.cols = Math.max(pos.col - item.col, 1);

            scope.$apply(function() {
              item.rows = pos.rows;
              item.cols = pos.cols;
            });

            x = x - parseFloat(event.target.style.left);
            y = y - parseFloat(event.target.style.top);

            event.target.style.width = x + 'px';
            event.target.style.height = y + 'px';
          },
          onend: function(event) {
            scope.$apply(function() {
              gridy.dragItem = null;
            });

            event.target.style.width = item.getWidth() + 'px';
            event.target.style.height = item.getHeight() + 'px';

            if (oldProps.row !== item.row || oldProps.col !== item.col || oldProps.rows !== item.rows || oldProps.cols !== item.cols) {
              scope.$emit('gridy-change');
            }

            gridy.floatItems();
          }
        })
        .actionChecker(function(event, defaultAction) {
          currEvent = event;

          return ! nonInteractables[event.target.tagName] && gridy.interacting ? defaultAction : null;
        })
        .inertia(false)
      ;

      var currEvent = null;
      var nonInteractables = { 'A' : true, 'INPUT' : true, 'SELECT' : true, 'TEXTAREA' : true, 'BUTTON' : true };

      function dragStart() {
        scope.$apply(function() {
          item.dragging = true;
          item.selected = true;

          gridy.interacting = true;

          interact.simulate('drag', $element[0], currEvent);
        });
      }

      function resizeStart() {
        scope.$apply(function() {
          item.resizing = true;
          item.selected = true;

          gridy.interacting = true;

          interact.simulate('resize', $element[0], currEvent);
        });
      }

      function interactStop() {
        $timeout(function() {
          item.resizing = false;
          item.dragging = false;
          item.selected = false;

          gridy.interacting = false;
        });
      }

      var dragEvent = {
        target : $element.find(gridy.dragHandle),
        type : 'longpress',
        listener : function(event) {
          if (! gridy.mobile && event.type.match(/down$|start$/) !== null) {
            dragStart();
          }
        }
      };

      var resizeEvent = {
        target : $element.find(gridy.resizeHandle),
        type : 'longpress',
        listener : function(event) {
          if (! gridy.mobile && event.type.match(/down$|start$/) !== null) {
            eventjs.add(interactStopEvent);

            resizeStart();
          }
        }
      };

      var interactStopEvent = {
        target : window,
        type : 'longpress',
        listener : function(event) {
          if (! gridy.mobile && event.type.match(/up$|end$/) !== null) {
            interactStop();
          }
        }
      };

      eventjs.add(dragEvent);
      eventjs.add(resizeEvent);
      eventjs.add(interactStopEvent);

      function positionChanged() {
        if (! gridy.mobile) {
          item.setPosition(item.row, item.col);

          if ($getters.row && $getters.row.assign) {
            $getters.row.assign(scope, item.row);
          }
          if ($getters.col && $getters.col.assign) {
            $getters.col.assign(scope, item.col);
          }
        }
      }

      function sizeChanged() {
        if (! gridy.mobile) {
          item.setSize(item.rows, item.cols);

          if ($getters.rows && $getters.rows.assign) {
            $getters.rows.assign(scope, item.rows);
          }
          if ($getters.cols && $getters.cols.assign) {
            $getters.cols.assign(scope, item.cols);
          }
        }
      }

      scope.$watch(function() {
        return item.row;
      }, positionChanged);

      scope.$watch(function() {
        return item.col;
      }, positionChanged);

      scope.$watch(function() {
        return item.rows;
      }, sizeChanged);

      scope.$watch(function() {
        return item.cols;
      }, sizeChanged);

      // give other items time to adjust
      $timeout(function() {
        item.floating = true;
      }, 100);

      return scope.$on('$destroy', function() {
        try {
          gridy.removeItem(item);
        } catch (e) {}
        try {
          eventjs.remove(dragEvent);
        } catch (e) {}
        try {
          eventjs.remove(resizeEvent);
        } catch (e) {}
        try {
          eventjs.remove(interactStopEvent);
        } catch (e) {}
        try {
          eventjs.remove(zoomEvent);
        } catch (e) {}
        try {
          interactable.unset();
        } catch (e) {}
      });
    }
  };
}]);