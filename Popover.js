'use strict';

import React, { PropTypes } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  Text,
  TouchableWithoutFeedback,
  View,
  Easing,
  Modal,
  Alert
} from 'react-native';
import _ from 'lodash';

var noop = () => {};

var {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
var DEFAULT_ARROW_SIZE = new Size(10, 5);

function Point(x, y) {
  this.x = x;
  this.y = y;
}

function Size(width, height) {
  this.width = width;
  this.height = height;
}

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

var Popover = React.createClass({
  propTypes: {
    isVisible: PropTypes.bool,
    onClose: PropTypes.func,
  },
  getInitialState() {
    return {
      contentSize: {},
      anchorPoint: {},
      popoverOrigin: {},
      placement: 'auto',
      visible: false,
      defaultAnimatedValues: {
        scale: new Animated.Value(0),
        translate: new Animated.ValueXY(),
        fade: new Animated.Value(0),
      },
    };
  },
  getDefaultProps() {
    return {
      isVisible: false,
      displayArea: new Rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT),
      arrowSize: DEFAULT_ARROW_SIZE,
      placement: 'auto',
      onClose: noop,
    };
  },
  measureContent(x) {
    var contentSize = this.state.contentSize;
    if (x) {
      var {width, height} = x.nativeEvent.layout;
      contentSize = {width, height};
    }

    var geom = this.computeGeometry({contentSize});
    console.log("Got New Geometry");
    console.log(geom);

    var isAwaitingShow = this.state.isAwaitingShow;
    this.updateState(Object.assign(geom,
      {contentSize, isAwaitingShow: undefined}), () => {
      // Once state is set, call the showHandler so it can access all the geometry
      // from the state
      isAwaitingShow && this._startAnimation({show: true});
    });
  },
  updateState(state, callback) {
      if(!this._updateState) {
          this._updateState = _.debounce(this.setState.bind(this), 100);
      }
      this._updateState(state, callback);
  },
  computeGeometry({contentSize, placement}) {
    placement = placement || this.props.placement;

    if (this.props.fromRect) {
      var options = {
        displayArea: new Rect(10, 20, this.props.displayArea.width - 20, this.props.displayArea.height - 30),
        fromRect: this.props.fromRect,
        arrowSize: this.getArrowSize(placement),
        contentSize
      }

      switch (placement) {
        case 'top':
          return this.computeTopGeometry(options);
        case 'bottom':
          return this.computeBottomGeometry(options);
        case 'left':
          return this.computeLeftGeometry(options);
        case 'right':
          return this.computeRightGeometry(options);
        default:
          return this.computeAutoGeometry(options);
      }
    } else {
      let displayArea = this.props.displayArea;
      var popoverOrigin = new Point((displayArea.width - contentSize.width)/2, (displayArea.height - contentSize.height)/2);
      var anchorPoint = new Point(displayArea.width/2, displayArea.height/2);
      return {
        popoverOrigin,
        anchorPoint
      }
    }

  },
  computeTopGeometry({displayArea, fromRect, contentSize, arrowSize}) {
    var popoverOrigin = new Point(
      Math.min(displayArea.x + displayArea.width - contentSize.width,
        Math.max(displayArea.x, fromRect.x + (fromRect.width - contentSize.width) / 2)),
      fromRect.y - contentSize.height - arrowSize.height);
    console.log("computeTopGeometry");
    console.log(displayArea);
    console.log(fromRect);
    console.log(contentSize);
    console.log(arrowSize);
    //if (popoverOrigin.x < 20) popoverOrigin.x = 20;
    //if (popoverOrigin.x + contentSize.width >= displayArea.width) popoverOrigin.x = displayArea.width - contentSize.width - 20;
    var anchorPoint = new Point(fromRect.x + fromRect.width / 2.0, fromRect.y);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'top',
    }
  },
  computeBottomGeometry({displayArea, fromRect, contentSize, arrowSize}) {
    var popoverOrigin = new Point(
      Math.min(displayArea.x + displayArea.width - contentSize.width,
        Math.max(displayArea.x, fromRect.x + (fromRect.width - contentSize.width) / 2)),
      fromRect.y + fromRect.height + arrowSize.height);
    //if (popoverOrigin.x < 20) popoverOrigin.x = 20;
    //if (popoverOrigin.x + contentSize.width >= displayArea.width - 20) popoverOrigin.x = displayArea.width - contentSize.width - 20;
    var anchorPoint = new Point(fromRect.x + fromRect.width / 2.0, fromRect.y + fromRect.height);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'bottom',
    }
  },
  computeLeftGeometry({displayArea, fromRect, contentSize, arrowSize}) {
    var popoverOrigin = new Point(fromRect.x - contentSize.width - arrowSize.width,
      Math.min(displayArea.y + displayArea.height - contentSize.height,
        Math.max(displayArea.y, fromRect.y + (fromRect.height - contentSize.height) / 2)));
    //if (popoverOrigin.y < 20) popoverOrigin.y = 20;
    var anchorPoint = new Point(fromRect.x, fromRect.y + fromRect.height / 2.0);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'left',
    }
  },
  computeRightGeometry({displayArea, fromRect, contentSize, arrowSize}) {
    var popoverOrigin = new Point(fromRect.x + fromRect.width + arrowSize.width,
      Math.min(displayArea.y + displayArea.height - contentSize.height,
        Math.max(displayArea.y, fromRect.y + (fromRect.height - contentSize.height) / 2)));
    //if (popoverOrigin.y < 20) popoverOrigin.y = 20;
    var anchorPoint = new Point(fromRect.x + fromRect.width, fromRect.y + fromRect.height / 2.0);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'right',
    }
  },
  computeAutoGeometry({displayArea, contentSize}) {
    var placementsToTry = ['left', 'right', 'bottom', 'top'];

    for (var i = 0; i < placementsToTry.length; i++) {
      var placement = placementsToTry[i];
      var geom = this.computeGeometry({contentSize: contentSize, placement: placement});
      var {popoverOrigin} = geom;

      if (popoverOrigin.x >= displayArea.x
          && popoverOrigin.x <= displayArea.x + displayArea.width - contentSize.width
          && popoverOrigin.y >= displayArea.y
          && popoverOrigin.y <= displayArea.y + displayArea.height - contentSize.height) {
        break;
      }
    }

    return geom;
  },
  getArrowSize(placement) {
    var size = this.props.arrowSize;
    switch(placement) {
      case 'left':
      case 'right':
        return new Size(size.height, size.width);
      default:
        return size;
    }
  },
  getArrowColorStyle(color) {
    return { borderTopColor: color };
  },
  getArrowRotation(placement) {
    switch (placement) {
      case 'bottom':
        return '180deg';
      case 'left':
        return '-90deg';
      case 'right':
        return '90deg';
      default:
        return '0deg';
    }
  },
  getArrowDynamicStyle() {
    var {anchorPoint, popoverOrigin} = this.state;
    var arrowSize = this.props.arrowSize;

    // Create the arrow from a rectangle with the appropriate borderXWidth set
    // A rotation is then applied dependending on the placement
    // Also make it slightly bigger
    // to fix a visual artifact when the popover is animated with a scale
    var width = arrowSize.width + 2;
    var height = arrowSize.height * 2 + 2;

    return {
      left: anchorPoint.x - popoverOrigin.x - width / 2,
      top: anchorPoint.y - popoverOrigin.y - height / 2,
      width: width,
      height: height,
      borderTopWidth: height / 2,
      borderRightWidth: width / 2,
      borderBottomWidth: height / 2,
      borderLeftWidth: width / 2,
    }
  },
  getTranslateOrigin() {
    var {contentSize, popoverOrigin, anchorPoint} = this.state;
    // console.log("getTranslateOrigin");
    // console.log(popoverOrigin);
    // console.log(anchorPoint);
    // console.log(contentSize);
    var popoverCenter = new Point(popoverOrigin.x + contentSize.width / 2,
      popoverOrigin.y + contentSize.height / 2);
    return new Point(anchorPoint.x - popoverCenter.x, anchorPoint.y - popoverCenter.y);
  },
  componentWillReceiveProps(nextProps:any) {
    var willBeVisible = nextProps.isVisible;
    var {
      isVisible,
    } = this.props;

    console.log("New Display Area");
    console.log(nextProps.displayArea);

    if (willBeVisible !== isVisible) {
      if (willBeVisible) {
        // We want to start the show animation only when contentSize is known
        // so that we can have some logic depending on the geometry
        this.setState({contentSize: {}, visible: true, isAwaitingShow: true});
      } else {
        this._startAnimation({show: false});
      }
    } else if (nextProps.displayArea.width !== this.props.displayArea.width || nextProps.fromRect && nextProps.fromRect !== this.props.fromRect) {
      this.setState({}, () => this.measureContent());
    }
  },
  _startAnimation({show}) {
    var handler = this.props.startCustomAnimation || this._startDefaultAnimation;
    handler({show, doneCallback: show ? null : obj => this.setState({visible: false})});
  },
  _startDefaultAnimation({show, doneCallback}) {
    var animDuration = 300;
    var values = this.state.defaultAnimatedValues;
    var translateOrigin = this.getTranslateOrigin();

    if (show) {
      values.translate.setValue(translateOrigin);
    }

    var commonConfig = {
      duration: animDuration,
      easing: show ? Easing.out(Easing.back()) : Easing.inOut(Easing.quad),
      useNativeDriver: true
    }

    Animated.parallel([
      Animated.timing(values.fade, {
        toValue: show ? 1 : 0,
        ...commonConfig,
      }),
      Animated.timing(values.translate, {
        toValue: show ? new Point(0, 0) : translateOrigin,
        ...commonConfig,
      }),
      Animated.timing(values.scale, {
        toValue: show ? 1 : 0,
        ...commonConfig,
      })
    ]).start(doneCallback);
  },
  _getDefaultAnimatedStyles() {
    // If there's a custom animation handler,
    // we don't return the default animated styles
    if (typeof this.props.startCustomAnimation !== 'undefined') {
      return null;
    }

    var animatedValues = this.state.defaultAnimatedValues;

    // console.log("Animated Values");
    // console.log(animatedValues)
    // console.log(animatedValues.translate.x._value);

    return {
      backgroundStyle: {
        opacity: animatedValues.fade,
      },
      arrowStyle: {
        opacity: animatedValues.fade,
        transform: [
          {
            scale: animatedValues.scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          }
        ],
      },
      contentStyle: {
        opacity: animatedValues.fade,
        transform: [
          {translateX: animatedValues.translate.x},
          {translateY: animatedValues.translate.y},
          {scale: animatedValues.scale},
        ],
      }
    };
  },
  _getExtendedStyles() {
    var background = [];
    var popover = [];
    var arrow = [];
    var content = [];

    [this._getDefaultAnimatedStyles(), this.props].forEach((source) => {
      if (source) {
        background.push(source.backgroundStyle);
        popover.push(source.popoverStyle);
        arrow.push(source.arrowStyle);
        content.push(source.contentStyle);
      }
    });

    return {
      background,
      popover,
      arrow,
      content,
    }
  },
  render() {
    var {popoverOrigin, placement} = this.state;
    var extendedStyles = this._getExtendedStyles();
    var contentStyle = [styles.content, ...extendedStyles.content];
    var arrowColor = StyleSheet.flatten(contentStyle).backgroundColor;
    var arrowColorStyle = this.getArrowColorStyle(arrowColor);
    var arrowDynamicStyle = this.getArrowDynamicStyle();
    var contentSizeAvailable = this.state.contentSize.width !== undefined;

    // Special case, force the arrow rotation even if it was overriden
    var arrowStyle = [styles.arrow, arrowDynamicStyle, arrowColorStyle, ...extendedStyles.arrow];
    var arrowTransform = (StyleSheet.flatten(arrowStyle).transform || []).slice(0);
    arrowTransform.unshift({rotate: this.getArrowRotation(placement)});
    arrowStyle = [...arrowStyle, {transform: arrowTransform}];

    return (
      <Modal transparent={true} supportedOrientations={['portrait', 'landscape']} hardwareAccelerated={true} visible={this.state.visible} onRequestClose={this.props.onClose}>
        <View style={[styles.container, contentSizeAvailable && styles.containerVisible ]}>
          <TouchableWithoutFeedback onPress={this.props.onClose}>
            <Animated.View style={[styles.background, ...extendedStyles.background]}/>
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.popover, {
            top: popoverOrigin.y,
            left: popoverOrigin.x,
            }, ...extendedStyles.popover]}>
            {this.props.fromRect !== undefined && <Animated.View style={arrowStyle}/>}
            <Animated.View ref='content' onLayout={this.measureContent} style={contentStyle}>
              {this.props.children}
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
});


var styles = StyleSheet.create({
  container: {
    opacity: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  containerVisible: {
    opacity: 1,
  },
  background: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  popover: {
    backgroundColor: 'transparent',
    position: 'absolute',
    shadowColor: 'black',
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 2,
    shadowOpacity: 0.8,
  },
  content: {
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  arrow: {
    position: 'absolute',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
});

module.exports = Popover;
