/**
 * @jsx React.DOM
 */

var Circle = React.createClass({
  render: function() {
    return this.transferPropsTo(<TweenSprite class="Circle" />);
  }
});

var CSSAnimatedCircle = React.createClass({
  render: function() {
    var x = new TweenedValue(0, [TweenStep.ease(1000, 100, EasingFunctions.ease)]);
    return <Circle x={x} />;
  }
});
var JSAnimatedCircle = React.createClass({
  render: function() {
    var x = new TweenedValue(0, [TweenStep.ease(1000, 100, EasingFunctions.ease)], true);
    return <Circle x={x} />;
  }
});
var RawJSAnimatedCircle = React.createClass({
  mixins: [TweenMixin],
  getInitialState: function() {
    return {x: 1};
  },
  componentDidMount: function() {
    this.tweenState({x: new TweenedValue(0, [TweenStep.ease(1000, 100, EasingFunctions.ease)])});
  },
  render: function() {
    return <Circle x={this.state.x * 2} />;
  }
});
var App = React.createClass({
  render: function() {
    return (
      <div>
        <CSSAnimatedCircle />
        <JSAnimatedCircle />
        <RawJSAnimatedCircle />
      </div>
    );
  }
});

React.renderComponent(<App />, document.body);