/**
 * @jsx React.DOM
 */

var Circle = React.createClass({
  render: function() {
    return this.transferPropsTo(<TweenSprite class="Circle" />);
  }
});

var CSSAnimatedCircle = React.createClass({
  getInitialState: function() {
    return {x: new TweenedValue(0, [TweenStep.ease(1000, 100, EasingFunctions.ease)])};
  },
  render: function() {
    return <Circle x={this.state.x} />;
  }
});
var JSAnimatedCircle = React.createClass({
  getInitialState: function() {
    return {x: new TweenedValue(0, [TweenStep.ease(1000, 100, EasingFunctions.ease)], true)};
  },
  render: function() {
    return <Circle x={this.state.x} />;
  }
});
var App = React.createClass({
  render: function() {
    return (
      <div>
        <CSSAnimatedCircle />
        <JSAnimatedCircle />
      </div>
    );
  }
});

React.renderComponent(<App />, document.body);