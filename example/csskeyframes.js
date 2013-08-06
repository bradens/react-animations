/**
 * @jsx React.DOM
 */

var Circle = React.createClass({
  render: function() {
    return this.transferPropsTo(<Sprite class="Circle" />);
  }
});

var PREFIX = 'react-animation-';
var count = 0;

function renderCSS(animation) {
  // insert keyframes into DOM, return css animation stuff
  var animationName = PREFIX + (count++);
  var style = document.createElement('style');
  style.type = 'text/css';
  var content = '@-webkit-keyframes ' + animationName + ' {\n';
  for (var key in animation.keyframes) {
    content += key + ' {\n';
    for (var prop in animation.keyframes[key]) {
      content += prop + ': ' + animation.keyframes[key][prop] + ';\n';
    }
    content += '}\n';
  }
  content += '}\n';
  style.innerHTML = content;
  document.head.appendChild(style);

  // now create the animation style
  // TODO: also include the last keyframe data
  return {
    '-webkit-animation': animationName + ' ' + animation.duration + 's'
  };
}

var xTweenedValue = new TweenedValue(0, [TweenStep.ease(10, 100, EasingFunctions.ease)]);
var zeroTweenedValue = constantTweenedValueForTranslate3d(xTweenedValue, 0);

var CSSAnimatedCircle = React.createClass({
  componentWillMount: function() {
    this.css = renderCSS(getTranslate3dAnimation(xTweenedValue, zeroTweenedValue, zeroTweenedValue));
  },
  render: function() {
    return (
      <StaticSprite>
        <Circle style={this.css} />
      </StaticSprite>
    );
  }
});
/*
var JSAnimatedCircle = React.createClass({
  getInitialState: function() {
    return {left: xTweenedValue};
  },
  render: function() {
    return <Sprite x={this.state.left}><
  }
});
*/
var App = React.createClass({
  render: function() {
    // Build some simple DOM -- see leftnav.css for how
    // it fits together.
    return (
      <div>
        <CSSAnimatedCircle />
      </div>
    );
  }
});

React.renderComponent(<App />, document.body);