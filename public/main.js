(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.f = factory();
  }
}(this, function () {

  'use strict';

  function Failure(actual, expected, ctx) {
    this.actual = actual;
    this.expected = expected;
    this.ctx = ctx;
  }

  Failure.prototype.toString = function () {
    var ctx = this.ctx ? this.ctx.join(' / ') : '';
    ctx = ctx ? ', context: ' + ctx : ', (no context)';
    return 'Expected an instance of ' + this.expected.name +
    ' got ' + JSON.stringify(this.actual) + ctx;
  };

  function Type(name, validate, is) {
    this.name = name;
    this.validate = validate;
    if (is) { this.is = is; }
  }

  Type.prototype.is = function (x) {
    return this.validate(x, null, true) === null;
  };

  function define(name, is) {
    var type = new Type(name, function (x, ctx) {
      return is(x) ? null : [new Failure(x, type, ctx)];
    }, is);
    return type;
  }

  var Any = define('any', function () {
    return true;
  });

  var Mixed = define('mixed', function () {
    return true;
  });

  var Void = define('void', function (x) {
    return x === void 0;
  });

  var Str = define('string', function (x) {
    return typeof x === 'string';
  });

  var Num = define('number', function (x) {
    return typeof x === 'number';
  });

  var Bool = define('boolean', function (x) {
    return x === true || x === false;
  });

  var Arr = define('array', function (x) {
    return x instanceof Array;
  });

  var Obj = define('object', function (x) {
    return x != null && typeof x === 'object' && !Arr.is(x);
  });

  var Func = define('function', function (x) {
    return typeof x === 'function';
  });

  function validate(x, type, ctx, fast) {
    if (type.validate) { return type.validate(x, ctx, fast); }
    return x instanceof type ? null : [new Failure(x, type, ctx)];
  }

  function list(type, name) {
    name = name || 'Array<' + type.name + '>';
    return new Type(name, function (x, ctx, fast) {
      ctx = ctx || [];
      ctx.push(name);
      // if x is not an array, fail fast
      if (!Arr.is(x)) { return [new Failure(x, Arr, ctx)]; }
      var errors = null, suberrors;
      for (var i = 0, len = x.length ; i < len ; i++ ) {
        suberrors = validate(x[i], type, ctx.concat(i));
        if (suberrors) {
          if (fast) { return suberrors; }
          errors = errors || [];
          errors.push.apply(errors, suberrors);
        }
      }
      return errors;
    });
  }

  function optional(type, name) {
    name = name || type.name + '?';
    return new Type(name, function (x, ctx, fast) {
      if (x === void 0) { return null; }
      ctx = ctx || [];
      ctx.push(name);
      return validate(x, type, ctx, fast);
    });
  }

  function maybe(type, name) {
    name = name || '?' + type.name;
    return new Type(name, function (x, ctx, fast) {
      if (x === null) { return null; }
      ctx = ctx || [];
      ctx.push(name);
      return validate(x, type, ctx, fast);
    });
  }

  function getName(type) {
    return type.name;
  }

  function tuple(types, name) {
    name = name || '[' + types.map(getName).join(', ') + ']';
    var dimension = types.length;
    var type = new Type(name, function (x, ctx, fast) {
      ctx = ctx || [];
      // if x is not an array, fail fast
      if (!Arr.is(x)) { return [new Failure(x, Arr, ctx.concat(name))]; }
      // if x has a wrong length, fail fast
      if (x.length !== dimension) { return [new Failure(x, type, ctx)]; }
      var errors = null, suberrors;
      for (var i = 0 ; i < dimension ; i++ ) {
        suberrors = validate(x[i], types[i], ctx.concat(name, i));
        if (suberrors) {
          if (fast) { return suberrors; }
          errors = errors || [];
          errors.push.apply(errors, suberrors);
        }
      }
      return errors;
    });
    return type;
  }

  function dict(domain, codomain, name) {
    name = name || '{[key: ' + domain.name + ']: ' + codomain.name + '}';
    return new Type(name, function (x, ctx, fast) {
      ctx = ctx || [];
      // if x is not an object, fail fast
      if (!Obj.is(x)) { return [new Failure(x, Obj, ctx.concat(name))]; }
      var errors = null, suberrors;
      for (var k in x) {
        if (x.hasOwnProperty(k)) {
          // check domain
          suberrors = validate(k, domain, ctx.concat(name, k));
          if (suberrors) {
            if (fast) { return suberrors; }
            errors = errors || [];
            errors.push.apply(errors, suberrors);
          }
          // check codomain
          suberrors = validate(x[k], codomain, ctx.concat(name, k));
          if (suberrors) {
            if (fast) { return suberrors; }
            errors = errors || [];
            errors.push.apply(errors, suberrors);
          }
        }
      }
      return errors;
    });
  }

  function shape(props, name) {
    name = name || '{' + Object.keys(props).map(function (k) { return k + ': ' + props[k].name + ';'; }).join(' ') + '}';
    return new Type(name, function (x, ctx, fast) {
      ctx = ctx || [];
      // if x is not an object, fail fast
      if (!Obj.is(x)) { return [new Failure(x, Obj, ctx.concat(name))]; }
      var errors = null, suberrors;
      for (var k in props) {
        if (props.hasOwnProperty(k)) {
          suberrors = validate(x[k], props[k], ctx.concat(name, k));
          if (suberrors) {
            if (fast) { return suberrors; }
            errors = errors || [];
            errors.push.apply(errors, suberrors);
          }
        }
      }
      return errors;
    });
  }

  function union(types, name) {
    name = name || types.map(getName).join(' | ');
    var type = new Type(name, function (x, ctx) {
      if (types.some(function (type) {
        return type.is(x);
      })) { return null; }
      ctx = ctx || [];
      return [new Failure(x, type, ctx.concat(name))];
    });
    return type;
  }

  function slice(arr, start, end) {
    return Array.prototype.slice.call(arr, start, end);
  }

  function args(types, varargs) {
    var name = '(' + types.map(getName).join(', ') + ', ...' + (varargs || Any).name + ')';
    var len = types.length;
    var typesTuple = tuple(types);
    if (varargs) { varargs = list(varargs); }
    return new Type(name, function (x, ctx, fast) {
      ctx = ctx || [];
      var args = x;
      // test if args is an array-like structure
      if (args.hasOwnProperty('length')) {
        args = slice(args, 0, len);
        // handle optional arguments filling the array with undefined values
        if (args.length < len) { args.length = len; }
      }
      var errors = null, suberrors;
      suberrors = typesTuple.validate(args, ctx.concat('arguments'), fast);
      if (suberrors) {
        if (fast) { return suberrors; }
        errors = errors || [];
        errors.push.apply(errors, suberrors);
      }
      if (varargs) {
        suberrors = varargs.validate(slice(x, len), ctx.concat('varargs'), fast);
        if (suberrors) {
          if (fast) { return suberrors; }
          errors = errors || [];
          errors.push.apply(errors, suberrors);
        }
      }
      return errors;
    });
  }

  function check(x, type) {
    var errors = validate(x, type);
    if (errors) {
      var message = [].concat(errors).join('\n');
      debugger;
      throw new TypeError(message);
    }
    return x;
  }

  var exports = {
    Type: Type,
    define: define,
    any: Any,
    mixed: Mixed,
    'void': Void,
    number: Num,
    string: Str,
    'boolean': Bool,
    object: Obj,
    'function': Func,
    list: list,
    optional: optional,
    maybe: maybe,
    tuple: tuple,
    dict: dict,
    shape: shape,
    union: union,
    arguments: args,
    check: check
  };

  return exports;

}));

},{}],2:[function(require,module,exports){
var _f = require("flowcheck/assert");

'use strict';

console.log('its alive');

},{"flowcheck/assert":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmxvd2NoZWNrL2Fzc2VydC5qcyIsIi9Vc2Vycy9tYXR0c3R5bGVzL3Byb2plY3RzL215cHJvamVjdHMvbmFtZS1nZW4vbmFtZS1nZW4td2ViLWNsaWVudC9zcmMvbWFpbi5qc3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVSQSxPQUFPLENBQUMsR0FBRyxDQUFFLFdBQVcsQ0FBRSxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAndXNlIHN0cmljdCc7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuZiA9IGZhY3RvcnkoKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIEZhaWx1cmUoYWN0dWFsLCBleHBlY3RlZCwgY3R4KSB7XG4gICAgdGhpcy5hY3R1YWwgPSBhY3R1YWw7XG4gICAgdGhpcy5leHBlY3RlZCA9IGV4cGVjdGVkO1xuICAgIHRoaXMuY3R4ID0gY3R4O1xuICB9XG5cbiAgRmFpbHVyZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGN0eCA9IHRoaXMuY3R4ID8gdGhpcy5jdHguam9pbignIC8gJykgOiAnJztcbiAgICBjdHggPSBjdHggPyAnLCBjb250ZXh0OiAnICsgY3R4IDogJywgKG5vIGNvbnRleHQpJztcbiAgICByZXR1cm4gJ0V4cGVjdGVkIGFuIGluc3RhbmNlIG9mICcgKyB0aGlzLmV4cGVjdGVkLm5hbWUgK1xuICAgICcgZ290ICcgKyBKU09OLnN0cmluZ2lmeSh0aGlzLmFjdHVhbCkgKyBjdHg7XG4gIH07XG5cbiAgZnVuY3Rpb24gVHlwZShuYW1lLCB2YWxpZGF0ZSwgaXMpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMudmFsaWRhdGUgPSB2YWxpZGF0ZTtcbiAgICBpZiAoaXMpIHsgdGhpcy5pcyA9IGlzOyB9XG4gIH1cblxuICBUeXBlLnByb3RvdHlwZS5pcyA9IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHRoaXMudmFsaWRhdGUoeCwgbnVsbCwgdHJ1ZSkgPT09IG51bGw7XG4gIH07XG5cbiAgZnVuY3Rpb24gZGVmaW5lKG5hbWUsIGlzKSB7XG4gICAgdmFyIHR5cGUgPSBuZXcgVHlwZShuYW1lLCBmdW5jdGlvbiAoeCwgY3R4KSB7XG4gICAgICByZXR1cm4gaXMoeCkgPyBudWxsIDogW25ldyBGYWlsdXJlKHgsIHR5cGUsIGN0eCldO1xuICAgIH0sIGlzKTtcbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuXG4gIHZhciBBbnkgPSBkZWZpbmUoJ2FueScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgdmFyIE1peGVkID0gZGVmaW5lKCdtaXhlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgdmFyIFZvaWQgPSBkZWZpbmUoJ3ZvaWQnLCBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiB4ID09PSB2b2lkIDA7XG4gIH0pO1xuXG4gIHZhciBTdHIgPSBkZWZpbmUoJ3N0cmluZycsIGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJztcbiAgfSk7XG5cbiAgdmFyIE51bSA9IGRlZmluZSgnbnVtYmVyJywgZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdudW1iZXInO1xuICB9KTtcblxuICB2YXIgQm9vbCA9IGRlZmluZSgnYm9vbGVhbicsIGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHggPT09IHRydWUgfHwgeCA9PT0gZmFsc2U7XG4gIH0pO1xuXG4gIHZhciBBcnIgPSBkZWZpbmUoJ2FycmF5JywgZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIEFycmF5O1xuICB9KTtcblxuICB2YXIgT2JqID0gZGVmaW5lKCdvYmplY3QnLCBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiB4ICE9IG51bGwgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmICFBcnIuaXMoeCk7XG4gIH0pO1xuXG4gIHZhciBGdW5jID0gZGVmaW5lKCdmdW5jdGlvbicsIGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICB9KTtcblxuICBmdW5jdGlvbiB2YWxpZGF0ZSh4LCB0eXBlLCBjdHgsIGZhc3QpIHtcbiAgICBpZiAodHlwZS52YWxpZGF0ZSkgeyByZXR1cm4gdHlwZS52YWxpZGF0ZSh4LCBjdHgsIGZhc3QpOyB9XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiB0eXBlID8gbnVsbCA6IFtuZXcgRmFpbHVyZSh4LCB0eXBlLCBjdHgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxpc3QodHlwZSwgbmFtZSkge1xuICAgIG5hbWUgPSBuYW1lIHx8ICdBcnJheTwnICsgdHlwZS5uYW1lICsgJz4nO1xuICAgIHJldHVybiBuZXcgVHlwZShuYW1lLCBmdW5jdGlvbiAoeCwgY3R4LCBmYXN0KSB7XG4gICAgICBjdHggPSBjdHggfHwgW107XG4gICAgICBjdHgucHVzaChuYW1lKTtcbiAgICAgIC8vIGlmIHggaXMgbm90IGFuIGFycmF5LCBmYWlsIGZhc3RcbiAgICAgIGlmICghQXJyLmlzKHgpKSB7IHJldHVybiBbbmV3IEZhaWx1cmUoeCwgQXJyLCBjdHgpXTsgfVxuICAgICAgdmFyIGVycm9ycyA9IG51bGwsIHN1YmVycm9ycztcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB4Lmxlbmd0aCA7IGkgPCBsZW4gOyBpKysgKSB7XG4gICAgICAgIHN1YmVycm9ycyA9IHZhbGlkYXRlKHhbaV0sIHR5cGUsIGN0eC5jb25jYXQoaSkpO1xuICAgICAgICBpZiAoc3ViZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKGZhc3QpIHsgcmV0dXJuIHN1YmVycm9yczsgfVxuICAgICAgICAgIGVycm9ycyA9IGVycm9ycyB8fCBbXTtcbiAgICAgICAgICBlcnJvcnMucHVzaC5hcHBseShlcnJvcnMsIHN1YmVycm9ycyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBlcnJvcnM7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvcHRpb25hbCh0eXBlLCBuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUgfHwgdHlwZS5uYW1lICsgJz8nO1xuICAgIHJldHVybiBuZXcgVHlwZShuYW1lLCBmdW5jdGlvbiAoeCwgY3R4LCBmYXN0KSB7XG4gICAgICBpZiAoeCA9PT0gdm9pZCAwKSB7IHJldHVybiBudWxsOyB9XG4gICAgICBjdHggPSBjdHggfHwgW107XG4gICAgICBjdHgucHVzaChuYW1lKTtcbiAgICAgIHJldHVybiB2YWxpZGF0ZSh4LCB0eXBlLCBjdHgsIGZhc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbWF5YmUodHlwZSwgbmFtZSkge1xuICAgIG5hbWUgPSBuYW1lIHx8ICc/JyArIHR5cGUubmFtZTtcbiAgICByZXR1cm4gbmV3IFR5cGUobmFtZSwgZnVuY3Rpb24gKHgsIGN0eCwgZmFzdCkge1xuICAgICAgaWYgKHggPT09IG51bGwpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgIGN0eCA9IGN0eCB8fCBbXTtcbiAgICAgIGN0eC5wdXNoKG5hbWUpO1xuICAgICAgcmV0dXJuIHZhbGlkYXRlKHgsIHR5cGUsIGN0eCwgZmFzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXROYW1lKHR5cGUpIHtcbiAgICByZXR1cm4gdHlwZS5uYW1lO1xuICB9XG5cbiAgZnVuY3Rpb24gdHVwbGUodHlwZXMsIG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZSB8fCAnWycgKyB0eXBlcy5tYXAoZ2V0TmFtZSkuam9pbignLCAnKSArICddJztcbiAgICB2YXIgZGltZW5zaW9uID0gdHlwZXMubGVuZ3RoO1xuICAgIHZhciB0eXBlID0gbmV3IFR5cGUobmFtZSwgZnVuY3Rpb24gKHgsIGN0eCwgZmFzdCkge1xuICAgICAgY3R4ID0gY3R4IHx8IFtdO1xuICAgICAgLy8gaWYgeCBpcyBub3QgYW4gYXJyYXksIGZhaWwgZmFzdFxuICAgICAgaWYgKCFBcnIuaXMoeCkpIHsgcmV0dXJuIFtuZXcgRmFpbHVyZSh4LCBBcnIsIGN0eC5jb25jYXQobmFtZSkpXTsgfVxuICAgICAgLy8gaWYgeCBoYXMgYSB3cm9uZyBsZW5ndGgsIGZhaWwgZmFzdFxuICAgICAgaWYgKHgubGVuZ3RoICE9PSBkaW1lbnNpb24pIHsgcmV0dXJuIFtuZXcgRmFpbHVyZSh4LCB0eXBlLCBjdHgpXTsgfVxuICAgICAgdmFyIGVycm9ycyA9IG51bGwsIHN1YmVycm9ycztcbiAgICAgIGZvciAodmFyIGkgPSAwIDsgaSA8IGRpbWVuc2lvbiA7IGkrKyApIHtcbiAgICAgICAgc3ViZXJyb3JzID0gdmFsaWRhdGUoeFtpXSwgdHlwZXNbaV0sIGN0eC5jb25jYXQobmFtZSwgaSkpO1xuICAgICAgICBpZiAoc3ViZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKGZhc3QpIHsgcmV0dXJuIHN1YmVycm9yczsgfVxuICAgICAgICAgIGVycm9ycyA9IGVycm9ycyB8fCBbXTtcbiAgICAgICAgICBlcnJvcnMucHVzaC5hcHBseShlcnJvcnMsIHN1YmVycm9ycyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBlcnJvcnM7XG4gICAgfSk7XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBkaWN0KGRvbWFpbiwgY29kb21haW4sIG5hbWUpIHtcbiAgICBuYW1lID0gbmFtZSB8fCAne1trZXk6ICcgKyBkb21haW4ubmFtZSArICddOiAnICsgY29kb21haW4ubmFtZSArICd9JztcbiAgICByZXR1cm4gbmV3IFR5cGUobmFtZSwgZnVuY3Rpb24gKHgsIGN0eCwgZmFzdCkge1xuICAgICAgY3R4ID0gY3R4IHx8IFtdO1xuICAgICAgLy8gaWYgeCBpcyBub3QgYW4gb2JqZWN0LCBmYWlsIGZhc3RcbiAgICAgIGlmICghT2JqLmlzKHgpKSB7IHJldHVybiBbbmV3IEZhaWx1cmUoeCwgT2JqLCBjdHguY29uY2F0KG5hbWUpKV07IH1cbiAgICAgIHZhciBlcnJvcnMgPSBudWxsLCBzdWJlcnJvcnM7XG4gICAgICBmb3IgKHZhciBrIGluIHgpIHtcbiAgICAgICAgaWYgKHguaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAvLyBjaGVjayBkb21haW5cbiAgICAgICAgICBzdWJlcnJvcnMgPSB2YWxpZGF0ZShrLCBkb21haW4sIGN0eC5jb25jYXQobmFtZSwgaykpO1xuICAgICAgICAgIGlmIChzdWJlcnJvcnMpIHtcbiAgICAgICAgICAgIGlmIChmYXN0KSB7IHJldHVybiBzdWJlcnJvcnM7IH1cbiAgICAgICAgICAgIGVycm9ycyA9IGVycm9ycyB8fCBbXTtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoLmFwcGx5KGVycm9ycywgc3ViZXJyb3JzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2hlY2sgY29kb21haW5cbiAgICAgICAgICBzdWJlcnJvcnMgPSB2YWxpZGF0ZSh4W2tdLCBjb2RvbWFpbiwgY3R4LmNvbmNhdChuYW1lLCBrKSk7XG4gICAgICAgICAgaWYgKHN1YmVycm9ycykge1xuICAgICAgICAgICAgaWYgKGZhc3QpIHsgcmV0dXJuIHN1YmVycm9yczsgfVxuICAgICAgICAgICAgZXJyb3JzID0gZXJyb3JzIHx8IFtdO1xuICAgICAgICAgICAgZXJyb3JzLnB1c2guYXBwbHkoZXJyb3JzLCBzdWJlcnJvcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNoYXBlKHByb3BzLCBuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUgfHwgJ3snICsgT2JqZWN0LmtleXMocHJvcHMpLm1hcChmdW5jdGlvbiAoaykgeyByZXR1cm4gayArICc6ICcgKyBwcm9wc1trXS5uYW1lICsgJzsnOyB9KS5qb2luKCcgJykgKyAnfSc7XG4gICAgcmV0dXJuIG5ldyBUeXBlKG5hbWUsIGZ1bmN0aW9uICh4LCBjdHgsIGZhc3QpIHtcbiAgICAgIGN0eCA9IGN0eCB8fCBbXTtcbiAgICAgIC8vIGlmIHggaXMgbm90IGFuIG9iamVjdCwgZmFpbCBmYXN0XG4gICAgICBpZiAoIU9iai5pcyh4KSkgeyByZXR1cm4gW25ldyBGYWlsdXJlKHgsIE9iaiwgY3R4LmNvbmNhdChuYW1lKSldOyB9XG4gICAgICB2YXIgZXJyb3JzID0gbnVsbCwgc3ViZXJyb3JzO1xuICAgICAgZm9yICh2YXIgayBpbiBwcm9wcykge1xuICAgICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICBzdWJlcnJvcnMgPSB2YWxpZGF0ZSh4W2tdLCBwcm9wc1trXSwgY3R4LmNvbmNhdChuYW1lLCBrKSk7XG4gICAgICAgICAgaWYgKHN1YmVycm9ycykge1xuICAgICAgICAgICAgaWYgKGZhc3QpIHsgcmV0dXJuIHN1YmVycm9yczsgfVxuICAgICAgICAgICAgZXJyb3JzID0gZXJyb3JzIHx8IFtdO1xuICAgICAgICAgICAgZXJyb3JzLnB1c2guYXBwbHkoZXJyb3JzLCBzdWJlcnJvcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVuaW9uKHR5cGVzLCBuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUgfHwgdHlwZXMubWFwKGdldE5hbWUpLmpvaW4oJyB8ICcpO1xuICAgIHZhciB0eXBlID0gbmV3IFR5cGUobmFtZSwgZnVuY3Rpb24gKHgsIGN0eCkge1xuICAgICAgaWYgKHR5cGVzLnNvbWUoZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGUuaXMoeCk7XG4gICAgICB9KSkgeyByZXR1cm4gbnVsbDsgfVxuICAgICAgY3R4ID0gY3R4IHx8IFtdO1xuICAgICAgcmV0dXJuIFtuZXcgRmFpbHVyZSh4LCB0eXBlLCBjdHguY29uY2F0KG5hbWUpKV07XG4gICAgfSk7XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBzbGljZShhcnIsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyLCBzdGFydCwgZW5kKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFyZ3ModHlwZXMsIHZhcmFyZ3MpIHtcbiAgICB2YXIgbmFtZSA9ICcoJyArIHR5cGVzLm1hcChnZXROYW1lKS5qb2luKCcsICcpICsgJywgLi4uJyArICh2YXJhcmdzIHx8IEFueSkubmFtZSArICcpJztcbiAgICB2YXIgbGVuID0gdHlwZXMubGVuZ3RoO1xuICAgIHZhciB0eXBlc1R1cGxlID0gdHVwbGUodHlwZXMpO1xuICAgIGlmICh2YXJhcmdzKSB7IHZhcmFyZ3MgPSBsaXN0KHZhcmFyZ3MpOyB9XG4gICAgcmV0dXJuIG5ldyBUeXBlKG5hbWUsIGZ1bmN0aW9uICh4LCBjdHgsIGZhc3QpIHtcbiAgICAgIGN0eCA9IGN0eCB8fCBbXTtcbiAgICAgIHZhciBhcmdzID0geDtcbiAgICAgIC8vIHRlc3QgaWYgYXJncyBpcyBhbiBhcnJheS1saWtlIHN0cnVjdHVyZVxuICAgICAgaWYgKGFyZ3MuaGFzT3duUHJvcGVydHkoJ2xlbmd0aCcpKSB7XG4gICAgICAgIGFyZ3MgPSBzbGljZShhcmdzLCAwLCBsZW4pO1xuICAgICAgICAvLyBoYW5kbGUgb3B0aW9uYWwgYXJndW1lbnRzIGZpbGxpbmcgdGhlIGFycmF5IHdpdGggdW5kZWZpbmVkIHZhbHVlc1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPCBsZW4pIHsgYXJncy5sZW5ndGggPSBsZW47IH1cbiAgICAgIH1cbiAgICAgIHZhciBlcnJvcnMgPSBudWxsLCBzdWJlcnJvcnM7XG4gICAgICBzdWJlcnJvcnMgPSB0eXBlc1R1cGxlLnZhbGlkYXRlKGFyZ3MsIGN0eC5jb25jYXQoJ2FyZ3VtZW50cycpLCBmYXN0KTtcbiAgICAgIGlmIChzdWJlcnJvcnMpIHtcbiAgICAgICAgaWYgKGZhc3QpIHsgcmV0dXJuIHN1YmVycm9yczsgfVxuICAgICAgICBlcnJvcnMgPSBlcnJvcnMgfHwgW107XG4gICAgICAgIGVycm9ycy5wdXNoLmFwcGx5KGVycm9ycywgc3ViZXJyb3JzKTtcbiAgICAgIH1cbiAgICAgIGlmICh2YXJhcmdzKSB7XG4gICAgICAgIHN1YmVycm9ycyA9IHZhcmFyZ3MudmFsaWRhdGUoc2xpY2UoeCwgbGVuKSwgY3R4LmNvbmNhdCgndmFyYXJncycpLCBmYXN0KTtcbiAgICAgICAgaWYgKHN1YmVycm9ycykge1xuICAgICAgICAgIGlmIChmYXN0KSB7IHJldHVybiBzdWJlcnJvcnM7IH1cbiAgICAgICAgICBlcnJvcnMgPSBlcnJvcnMgfHwgW107XG4gICAgICAgICAgZXJyb3JzLnB1c2guYXBwbHkoZXJyb3JzLCBzdWJlcnJvcnMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZXJyb3JzO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2soeCwgdHlwZSkge1xuICAgIHZhciBlcnJvcnMgPSB2YWxpZGF0ZSh4LCB0eXBlKTtcbiAgICBpZiAoZXJyb3JzKSB7XG4gICAgICB2YXIgbWVzc2FnZSA9IFtdLmNvbmNhdChlcnJvcnMpLmpvaW4oJ1xcbicpO1xuICAgICAgZGVidWdnZXI7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbiAgICByZXR1cm4geDtcbiAgfVxuXG4gIHZhciBleHBvcnRzID0ge1xuICAgIFR5cGU6IFR5cGUsXG4gICAgZGVmaW5lOiBkZWZpbmUsXG4gICAgYW55OiBBbnksXG4gICAgbWl4ZWQ6IE1peGVkLFxuICAgICd2b2lkJzogVm9pZCxcbiAgICBudW1iZXI6IE51bSxcbiAgICBzdHJpbmc6IFN0cixcbiAgICAnYm9vbGVhbic6IEJvb2wsXG4gICAgb2JqZWN0OiBPYmosXG4gICAgJ2Z1bmN0aW9uJzogRnVuYyxcbiAgICBsaXN0OiBsaXN0LFxuICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcbiAgICBtYXliZTogbWF5YmUsXG4gICAgdHVwbGU6IHR1cGxlLFxuICAgIGRpY3Q6IGRpY3QsXG4gICAgc2hhcGU6IHNoYXBlLFxuICAgIHVuaW9uOiB1bmlvbixcbiAgICBhcmd1bWVudHM6IGFyZ3MsXG4gICAgY2hlY2s6IGNoZWNrXG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG5cbn0pKTtcbiIsIlxuY29uc29sZS5sb2coICdpdHMgYWxpdmUnICk7XG4iXX0=
