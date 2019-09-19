'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MapInteraction = exports.MapInteractionCSS = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var clamp = function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
};

var isTouchDevice = function isTouchDevice() {
  return 'ontouchstart' in window || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
};

var eventNames = function eventNames() {
  var isTouch = isTouchDevice();

  return {
    down: isTouch ? 'touchstart' : 'mousedown',
    move: isTouch ? 'touchmove' : 'mousemove',
    up: isTouch ? 'touchend' : 'mouseup'
  };
};

var distance = function distance(p1, p2) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
};

var midpoint = function midpoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
};

var touchPt = function touchPt(touch) {
  return { x: touch.clientX, y: touch.clientY };
};

var touchDistance = function touchDistance(t0, t1) {
  var p0 = touchPt(t0);
  var p1 = touchPt(t1);
  return distance(p0, p1);
};

var coordChange = function coordChange(coordinate, scaleRatio) {
  return scaleRatio * coordinate - coordinate;
};

var translationShape = _propTypes2.default.shape({ x: _propTypes2.default.number, y: _propTypes2.default.number });

/*
  This contains logic for providing a map-like interaction to any DOM node.
  It allows a user to pinch, zoom, translate, etc, as they would an interactive map.
  It renders its children with the current state of the translation and does not do any scaling
  or translating on its own. This works on both desktop, and mobile.
*/

var MapInteraction = function (_Component) {
  _inherits(MapInteraction, _Component);

  _createClass(MapInteraction, null, [{
    key: 'propTypes',
    get: function get() {
      return {
        children: _propTypes2.default.func,
        scale: _propTypes2.default.number,
        translation: translationShape,
        defaultScale: _propTypes2.default.number,
        defaultTranslation: translationShape,
        onChange: _propTypes2.default.func,
        translationBounds: _propTypes2.default.shape({
          xMin: _propTypes2.default.number, xMax: _propTypes2.default.number, yMin: _propTypes2.default.number, yMax: _propTypes2.default.number
        }),
        minScale: _propTypes2.default.number,
        maxScale: _propTypes2.default.number,
        showControls: _propTypes2.default.bool,
        plusBtnContents: _propTypes2.default.node,
        minusBtnContents: _propTypes2.default.node,
        btnClass: _propTypes2.default.string,
        plusBtnClass: _propTypes2.default.string,
        minusBtnClass: _propTypes2.default.string,
        controlsClass: _propTypes2.default.string
      };
    }
  }, {
    key: 'defaultProps',
    get: function get() {
      return {
        minScale: 0.05,
        maxScale: 3,
        showControls: false,
        translationBounds: {}
      };
    }
  }]);

  function MapInteraction(props) {
    _classCallCheck(this, MapInteraction);

    var _this = _possibleConstructorReturn(this, (MapInteraction.__proto__ || Object.getPrototypeOf(MapInteraction)).call(this, props));

    var scale = props.scale,
        defaultScale = props.defaultScale,
        translation = props.translation,
        defaultTranslation = props.defaultTranslation,
        minScale = props.minScale,
        maxScale = props.maxScale;


    var desiredScale = void 0;
    if (scale != undefined) {
      desiredScale = scale;
    } else if (defaultScale != undefined) {
      desiredScale = defaultScale;
    } else {
      desiredScale = 1;
    }

    _this.state = {
      scale: clamp(minScale, desiredScale, maxScale),
      translation: translation || defaultTranslation || { x: 0, y: 0 },
      stopClickPropagation: false
    };

    _this.startPointerInfo = undefined;

    _this.onMouseDown = _this.onMouseDown.bind(_this);
    _this.onTouchDown = _this.onTouchDown.bind(_this);

    _this.onMouseMove = _this.onMouseMove.bind(_this);
    _this.onTouchMove = _this.onTouchMove.bind(_this);

    _this.onMouseUp = _this.onMouseUp.bind(_this);
    _this.onTouchEnd = _this.onTouchEnd.bind(_this);

    _this.onWheel = _this.onWheel.bind(_this);
    return _this;
  }

  _createClass(MapInteraction, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var events = eventNames();
      var handlers = this.handlers();

      this.containerNode.addEventListener(events.down, handlers.down);
      window.addEventListener(events.move, handlers.move);
      window.addEventListener(events.up, handlers.up);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(newProps) {
      var scale = newProps.scale != undefined ? newProps.scale : this.state.scale;
      var translation = newProps.translation || this.state.translation;

      // if parent has overridden state then abort current user interaction
      if (translation.x != this.state.translation.x || translation.y != this.state.translation.y || scale != this.state.scale) {
        this.setPointerState();
      }

      this.setState({
        scale: clamp(newProps.minScale, scale, newProps.maxScale),
        translation: this.clampTranslation(translation, newProps)
      });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      var events = eventNames();
      var handlers = this.handlers();

      this.containerNode.removeEventListener(events.down, handlers.down);
      window.removeEventListener(events.move, handlers.move);
      window.removeEventListener(events.up, handlers.up);
    }
  }, {
    key: 'updateParent',
    value: function updateParent() {
      if (!this.props.onChange) {
        return;
      }
      var _state = this.state,
          scale = _state.scale,
          translation = _state.translation;

      this.props.onChange({ scale: scale, translation: translation });
    }
  }, {
    key: 'onMouseDown',
    value: function onMouseDown(e) {
      this.setPointerState([e]);
    }
  }, {
    key: 'onTouchDown',
    value: function onTouchDown(e) {
      e.preventDefault();
      this.setPointerState(e.touches);
    }
  }, {
    key: 'onMouseUp',
    value: function onMouseUp() {
      this.setPointerState();
    }
  }, {
    key: 'onTouchEnd',
    value: function onTouchEnd(e) {
      this.setPointerState(e.touches);
    }
  }, {
    key: 'onMouseMove',
    value: function onMouseMove(e) {
      if (!this.startPointerInfo) {
        return;
      }
      this.onDrag(e);
    }
  }, {
    key: 'onTouchMove',
    value: function onTouchMove(e) {
      e.preventDefault();

      if (!this.startPointerInfo) {
        return;
      }

      if (e.touches.length == 2 && this.startPointerInfo.pointers.length > 1) {
        this.scaleFromMultiTouch(e);
      } else if (e.touches.length === 1 && this.startPointerInfo) {
        this.onDrag(e.touches[0]);
      }
    }

    // handles both touch and mouse drags

  }, {
    key: 'onDrag',
    value: function onDrag(pointer) {
      var _this2 = this;

      var _startPointerInfo = this.startPointerInfo,
          translation = _startPointerInfo.translation,
          pointers = _startPointerInfo.pointers;

      var startPointer = pointers[0];
      var dragX = pointer.clientX - startPointer.clientX;
      var dragY = pointer.clientY - startPointer.clientY;
      var newTranslation = {
        x: translation.x + dragX,
        y: translation.y + dragY
      };

      this.setState({
        translation: this.clampTranslation(newTranslation),
        stopClickPropagation: Boolean(Math.abs(dragX) + Math.abs(dragY) > 2)
      }, function () {
        return _this2.updateParent();
      });
    }
  }, {
    key: 'onWheel',
    value: function onWheel(e) {
      e.preventDefault();
      e.stopPropagation();

      var scaleChange = Math.pow(2, e.deltaY * 0.002);

      var newScale = clamp(this.props.minScale, this.state.scale + (1 - scaleChange), this.props.maxScale);

      var mousePos = this.clientPosToTranslatedPos({ x: e.clientX, y: e.clientY });

      this.scaleFromPoint(newScale, mousePos);
    }
  }, {
    key: 'setPointerState',
    value: function setPointerState(pointers) {
      if (!pointers) {
        this.startPointerInfo = undefined;
        return;
      }

      this.startPointerInfo = {
        pointers: pointers,
        scale: this.state.scale,
        translation: this.state.translation
      };
    }
  }, {
    key: 'clampTranslation',
    value: function clampTranslation(desiredTranslation) {
      var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.props;
      var x = desiredTranslation.x,
          y = desiredTranslation.y;
      var _props$translationBou = props.translationBounds,
          xMax = _props$translationBou.xMax,
          xMin = _props$translationBou.xMin,
          yMax = _props$translationBou.yMax,
          yMin = _props$translationBou.yMin;

      xMin = xMin != undefined ? xMin : -Infinity, yMin = yMin != undefined ? yMin : -Infinity, xMax = xMax != undefined ? xMax : Infinity, yMax = yMax != undefined ? yMax : Infinity;

      return {
        x: clamp(xMin, x, xMax),
        y: clamp(yMin, y, yMax)
      };
    }
  }, {
    key: 'translatedOrigin',
    value: function translatedOrigin() {
      var translation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state.translation;

      var clientOffset = this.containerNode.getBoundingClientRect();
      return {
        x: clientOffset.left + translation.x,
        y: clientOffset.top + translation.y
      };
    }
  }, {
    key: 'clientPosToTranslatedPos',
    value: function clientPosToTranslatedPos(_ref) {
      var x = _ref.x,
          y = _ref.y;
      var translation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.state.translation;

      var origin = this.translatedOrigin(translation);
      return {
        x: x - origin.x,
        y: y - origin.y
      };
    }
  }, {
    key: 'handlers',
    value: function handlers() {
      var isTouch = isTouchDevice();

      return {
        down: isTouch ? this.onTouchDown : this.onMouseDown,
        move: isTouch ? this.onTouchMove : this.onMouseMove,
        up: isTouch ? this.onTouchEnd : this.onMouseUp
      };
    }
  }, {
    key: 'scaleFromPoint',
    value: function scaleFromPoint(newScale, focalPt) {
      var _this3 = this;

      var _state2 = this.state,
          translation = _state2.translation,
          scale = _state2.scale;

      var scaleRatio = newScale / (scale != 0 ? scale : 1);

      var focalPtDelta = {
        x: coordChange(focalPt.x, scaleRatio),
        y: coordChange(focalPt.y, scaleRatio)
      };

      var newTranslation = {
        x: translation.x - focalPtDelta.x,
        y: translation.y - focalPtDelta.y
      };

      this.setState({
        scale: newScale,
        translation: this.clampTranslation(newTranslation)
      }, function () {
        return _this3.updateParent();
      });
    }
  }, {
    key: 'scaleFromMultiTouch',
    value: function scaleFromMultiTouch(e) {
      var _this4 = this;

      var startTouches = this.startPointerInfo.pointers;
      var newTouches = e.touches;

      // calculate new scale
      var dist0 = touchDistance(startTouches[0], startTouches[1]);
      var dist1 = touchDistance(newTouches[0], newTouches[1]);
      var scaleChange = dist1 / dist0;

      var startScale = this.startPointerInfo.scale;
      var targetScale = startScale + (scaleChange - 1) * startScale;
      var newScale = clamp(this.props.minScale, targetScale, this.props.maxScale);

      // calculate mid points
      var newMidPoint = midpoint(touchPt(newTouches[0]), touchPt(newTouches[1]));
      var startMidpoint = midpoint(touchPt(startTouches[0]), touchPt(startTouches[1]));

      var dragDelta = {
        x: newMidPoint.x - startMidpoint.x,
        y: newMidPoint.y - startMidpoint.y
      };

      var scaleRatio = newScale / startScale;

      var focalPt = this.clientPosToTranslatedPos(startMidpoint, this.startPointerInfo.translation);
      var focalPtDelta = {
        x: coordChange(focalPt.x, scaleRatio),
        y: coordChange(focalPt.y, scaleRatio)
      };

      var newTranslation = {
        x: this.startPointerInfo.translation.x - focalPtDelta.x + dragDelta.x,
        y: this.startPointerInfo.translation.y - focalPtDelta.y + dragDelta.y
      };

      this.setState({
        scale: newScale,
        translation: this.clampTranslation(newTranslation)
      }, function () {
        return _this4.updateParent();
      });
    }
  }, {
    key: 'discreteScaleStepSize',
    value: function discreteScaleStepSize() {
      var _props = this.props,
          minScale = _props.minScale,
          maxScale = _props.maxScale;

      var delta = Math.abs(maxScale - minScale);
      return delta / 10;
    }
  }, {
    key: 'changeScale',
    value: function changeScale(delta) {
      var targetScale = this.state.scale + delta;
      var _props2 = this.props,
          minScale = _props2.minScale,
          maxScale = _props2.maxScale;

      var scale = clamp(minScale, targetScale, maxScale);

      var rect = this.containerNode.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;

      var focalPoint = this.clientPosToTranslatedPos({ x: x, y: y });
      this.scaleFromPoint(scale, focalPoint);
    }
  }, {
    key: 'renderControls',
    value: function renderControls() {
      var _this5 = this;

      var step = this.discreteScaleStepSize();
      return _react2.default.createElement(Controls, {
        onClickPlus: function onClickPlus() {
          return _this5.changeScale(step);
        },
        onClickMinus: function onClickMinus() {
          return _this5.changeScale(-step);
        },
        plusBtnContents: this.props.plusBtnContents,
        minusBtnContents: this.props.minusBtnContents,
        btnClass: this.props.btnClass,
        plusBtnClass: this.props.plusBtnClass,
        minusBtnClass: this.props.minusBtnClass,
        controlsClass: this.props.controlsClass,
        scale: this.state.scale,
        minScale: this.props.minScale,
        maxScale: this.props.maxScale
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this6 = this;

      var _props3 = this.props,
          showControls = _props3.showControls,
          children = _props3.children;
      var scale = this.state.scale;
      // Defensively clamp the translation. This should not be necessary if we properly set state elsewhere.

      var translation = this.clampTranslation(this.state.translation);
      var touchEndHandler = function touchEndHandler(e) {
        if (_this6.state.stopClickPropagation) {
          e.stopPropagation();
          _this6.setState({ stopClickPropagation: false });
        }
      };
      return _react2.default.createElement(
        'div',
        {
          className: 'map-interaction',
          ref: function ref(node) {
            _this6.containerNode = node;
          },
          onWheel: this.onWheel,
          style: {
            height: '100%',
            width: '100%',
            position: 'relative' // for absolutely positioned children
          },
          onClickCapture: touchEndHandler,
          onTouchEndCapture: touchEndHandler
        },
        (children || undefined) && children({ translation: translation, scale: scale }),
        (showControls || undefined) && this.renderControls()
      );
    }
  }]);

  return MapInteraction;
}(_react.Component);

/*
  This component provides a map like interaction to any content that you place in it. It will let
  the user zoom and pan the children by scaling and translating props.children using css.
*/

var MapInteractionCSS = function MapInteractionCSS(props) {
  return _react2.default.createElement(
    MapInteraction,
    props,
    function (_ref2) {
      var translation = _ref2.translation,
          scale = _ref2.scale;

      // Translate first and then scale.  Otherwise, the scale would affect the translation.
      var transform = 'translate(' + translation.x + 'px, ' + translation.y + 'px) scale(' + scale + ')';
      return _react2.default.createElement(
        'div',
        {
          className: 'map-interaction-container',
          style: {
            height: '100%',
            width: '100%',
            position: 'relative', // for absolutely positioned children
            overflow: 'visible',
            touchAction: 'none', // Not supported in Safari :(
            msTouchAction: 'none',
            cursor: 'all-scroll',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }
        },
        _react2.default.createElement(
          'div',
          {
            className: 'map-interaction-inner',
            style: {
              display: 'flex',
              alignItems: 'center',
              transform: transform,
              transformOrigin: '0 0 ',
              height: '100%'
            }
          },
          props.children
        )
      );
    }
  );
};

var Controls = function (_Component2) {
  _inherits(Controls, _Component2);

  function Controls() {
    _classCallCheck(this, Controls);

    return _possibleConstructorReturn(this, (Controls.__proto__ || Object.getPrototypeOf(Controls)).apply(this, arguments));
  }

  _createClass(Controls, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.setPointerHandlers();
    }
  }, {
    key: 'setPointerHandlers',
    value: function setPointerHandlers() {
      var _this8 = this;

      var _props4 = this.props,
          onClickPlus = _props4.onClickPlus,
          onClickMinus = _props4.onClickMinus;


      var plusHandler = function plusHandler() {
        _this8.plusNode.blur();
        onClickPlus();
      };

      var minusHandler = function minusHandler() {
        _this8.minusNode.blur();
        onClickMinus();
      };

      var eventName = isTouchDevice() ? 'touchstart' : 'click';

      this.plusNode.addEventListener(eventName, plusHandler);
      this.minusNode.addEventListener(eventName, minusHandler);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this9 = this;

      var _props5 = this.props,
          plusBtnContents = _props5.plusBtnContents,
          minusBtnContents = _props5.minusBtnContents,
          btnClass = _props5.btnClass,
          plusBtnClass = _props5.plusBtnClass,
          minusBtnClass = _props5.minusBtnClass,
          controlsClass = _props5.controlsClass,
          scale = _props5.scale,
          minScale = _props5.minScale,
          maxScale = _props5.maxScale;


      var btnStyle = { width: 30, paddingTop: 5, marginBottom: 5 };
      var controlsStyle = controlsClass ? undefined : { position: 'absolute', right: 10, top: 10 };

      return _react2.default.createElement(
        'div',
        { style: controlsStyle, className: controlsClass },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'button',
            {
              ref: function ref(node) {
                _this9.plusNode = node;
              },
              className: [btnClass ? btnClass : '', plusBtnClass ? plusBtnClass : ''].join(' '),
              style: btnClass || plusBtnClass ? undefined : btnStyle,
              disabled: scale >= maxScale
            },
            plusBtnContents
          )
        ),
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'button',
            {
              ref: function ref(node) {
                _this9.minusNode = node;
              },
              className: [btnClass ? btnClass : '', minusBtnClass ? minusBtnClass : ''].join(' '),
              style: btnClass || minusBtnClass ? undefined : btnStyle,
              disabled: scale <= minScale
            },
            minusBtnContents
          )
        )
      );
    }
  }]);

  return Controls;
}(_react.Component);

Controls.propTypes = {
  onClickPlus: _propTypes2.default.func.isRequired,
  onClickMinus: _propTypes2.default.func.isRequired,
  plusBtnContents: _propTypes2.default.node,
  minusBtnContents: _propTypes2.default.node,
  btnClass: _propTypes2.default.string,
  plusBtnClass: _propTypes2.default.string,
  minusBtnClass: _propTypes2.default.string,
  controlsClass: _propTypes2.default.string,
  scale: _propTypes2.default.number,
  minScale: _propTypes2.default.number,
  maxScale: _propTypes2.default.number
};

Controls.defaultProps = {
  plusBtnContents: '+',
  minusBtnContents: '-'
};

exports.MapInteractionCSS = MapInteractionCSS;
exports.MapInteraction = MapInteraction;
exports.default = MapInteraction;
