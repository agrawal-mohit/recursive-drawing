(function() {
  var canvas, checkMouseOver, circle, combineComponents, ctx, draws, generateDraws, init, localCoords, makeComponent, makeCompoundDefinition, makeDefinition, makePrimitiveDefinition, makeTransform, movedCircle, render, renderDraws, setSize, ui;

  makeTransform = function(matrix) {
    var memoInverse, o;
    if (matrix == null) matrix = [1, 0, 0, 1, 0, 0];
    o = {};
    o.a = matrix;
    o.p = function(point) {
      var m, p;
      m = matrix;
      p = point;
      return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    };
    o.mult = function(transform) {
      var x, y;
      x = matrix;
      y = transform.a;
      return makeTransform([x[0] * y[0] + x[2] * y[1], x[1] * y[0] + x[3] * y[1], x[0] * y[2] + x[2] * y[3], x[1] * y[2] + x[3] * y[3], x[0] * y[4] + x[2] * y[5] + x[4], x[1] * y[4] + x[3] * y[5] + x[5]]);
    };
    memoInverse = false;
    o.inverse = function() {
      var a, b, c, d, e, f, x;
      if (memoInverse) return memoInverse;
      a = matrix[0], b = matrix[1], c = matrix[2], d = matrix[3], e = matrix[4], f = matrix[5];
      x = a * d - b * c;
      return memoInverse = makeTransform([d / x, -b / x, -c / x, a / x, (c * f - d * e) / x, (b * e - a * f) / x]);
    };
    o.set = function(ctx) {
      return ctx.setTransform.apply(ctx, matrix);
    };
    return o;
  };

  makeComponent = function(definition, transform) {
    var o;
    return o = {
      id: _.uniqueId("component"),
      definition: definition,
      transform: transform
    };
  };

  makeDefinition = function() {
    var o;
    return o = {
      view: makeTransform()
    };
  };

  makePrimitiveDefinition = function(draw) {
    var o;
    o = makeDefinition();
    o.draw = draw;
    return o;
  };

  makeCompoundDefinition = function() {
    var o;
    o = makeDefinition();
    o.components = [];
    o.add = function(definition, transform) {
      return o.components.push({
        transform: transform,
        definition: definition
      });
    };
    return o;
  };

  circle = makePrimitiveDefinition(function(ctx) {
    return ctx.arc(0, 0, 1, 0, Math.PI * 2);
  });

  movedCircle = makeCompoundDefinition();

  movedCircle.add(circle, makeTransform([0.5, 0, 0, 0.5, 0, 0]));

  movedCircle.add(movedCircle, makeTransform([0.7, 0, 0, 0.7, 0.5, 0]));

  movedCircle.add(movedCircle, makeTransform([0.7, 0, 0, 0.7, 0.5, 0.5]));

  ui = {
    focus: movedCircle,
    view: makeTransform([1, 0, 0, 1, 400, 300]),
    size: [100, 100],
    mouse: [100, 100],
    mouseOver: [],
    dragging: false
  };

  canvas = null;

  ctx = null;

  init = function() {
    canvas = $("#main");
    ctx = canvas[0].getContext('2d');
    setSize();
    $(window).resize(function() {
      setSize();
      return render();
    });
    $(window).mousemove(function(e) {
      var c0, components, mouse, objective, solution, target, uncmin;
      ui.mouse = [e.clientX, e.clientY];
      if (ui.dragging) {
        components = ui.mouseOver;
        mouse = ui.mouse;
        target = ui.dragging.startPosition;
        c0 = components[0];
        objective = function(args) {
          var error, newC0, newC0Transform, newComponents, result;
          newC0Transform = makeTransform(c0.transform.a.slice(0, 4).concat(args));
          newC0 = {
            transform: newC0Transform
          };
          newComponents = components.map(function(component) {
            if (component === c0) {
              return newC0;
            } else {
              return component;
            }
          });
          result = ui.view.mult(combineComponents(newComponents)).p(target);
          error = numeric['-'](result, mouse);
          return numeric.dot(error, error);
        };
        uncmin = numeric.uncmin(objective, c0.transform.a.slice(4, 6));
        solution = uncmin.solution;
        c0.transform = makeTransform(c0.transform.a.slice(0, 4).concat(solution));
      }
      return render();
    });
    $(window).mousedown(function(e) {
      return ui.dragging = {
        componentPath: ui.mouseOver,
        startPosition: localCoords(ui.mouseOver, ui.mouse)
      };
    });
    return $(window).mouseup(function(e) {
      return ui.dragging = false;
    });
  };

  setSize = function() {
    var minDimension, windowSize;
    ui.size = windowSize = [$(window).width(), $(window).height()];
    canvas.attr({
      width: windowSize[0],
      height: windowSize[1]
    });
    minDimension = Math.min(windowSize[0], windowSize[1]);
    return ui.view = makeTransform([minDimension / 2, 0, 0, minDimension / 2, windowSize[0] / 2, windowSize[1] / 2]);
  };

  generateDraws = function(definition, initialTransform) {
    var draws, i, process, queue;
    queue = [];
    draws = [];
    process = function(definition, transform, componentPath) {
      if (componentPath == null) componentPath = [];
      if (transform.a[0] < 0.001) return;
      if (definition.draw) {
        return draws.push({
          transform: transform,
          draw: definition.draw,
          componentPath: componentPath
        });
      } else {
        return definition.components.forEach(function(component) {
          return queue.push([component.definition, transform.mult(component.transform), componentPath.concat(component)]);
        });
      }
    };
    queue.push([definition, initialTransform]);
    i = 0;
    while (i < 1000) {
      if (!queue[i]) break;
      process.apply(null, queue[i]);
      i++;
    }
    return draws;
  };

  checkMouseOver = function(draws, ctx, mousePosition) {
    var ret;
    ret = void 0;
    draws.forEach(function(d) {
      d.transform.set(ctx);
      ctx.beginPath();
      d.draw(ctx);
      if (ctx.isPointInPath.apply(ctx, ui.mouse)) {
        return ret = {
          componentPath: d.componentPath
        };
      }
    });
    return ret;
  };

  renderDraws = function(draws, ctx) {
    return draws.forEach(function(d) {
      var _ref;
      d.transform.set(ctx);
      ctx.beginPath();
      d.draw(ctx);
      if (d.componentPath[0] === ((_ref = ui.mouseOver) != null ? _ref[0] : void 0)) {
        if (d.componentPath.every(function(component, i) {
          return component === ui.mouseOver[i];
        })) {
          ctx.fillStyle = "#f00";
        } else {
          ctx.fillStyle = "#600";
        }
      } else {
        ctx.fillStyle = "black";
      }
      return ctx.fill();
    });
  };

  draws = false;

  render = function() {
    var _ref;
    if (!draws || ui.dragging) draws = generateDraws(ui.focus, ui.view);
    if (!ui.dragging) {
      ui.mouseOver = (_ref = checkMouseOver(draws, ctx, ui.mouse)) != null ? _ref.componentPath : void 0;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.size[0], ui.size[1]);
    ctx.fillStyle = "black";
    return renderDraws(draws, ctx);
  };

  combineComponents = function(componentPath) {
    var combined;
    return combined = componentPath.reduce(function(transform, component) {
      return transform.mult(component.transform);
    }, makeTransform());
  };

  localCoords = function(componentPath, point) {
    var combined;
    combined = ui.view.mult(combineComponents(componentPath));
    return combined.inverse().p(point);
  };

  init();

  render();

}).call(this);
