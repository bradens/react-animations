// TODO:
// - Add call() and wait() (which is just call(emptyFunction))
// - Hook it up to Sprite (rename AnimationSurface)
// - Add translate3d() support
// - Hook it up to rAF

//var copyProperties = require('./util').copyProperties;
//var invariant = require('./util').invariant;
function copyProperties(dst, src) {
  for (var k in src) {
    if (!src.hasOwnProperty(k)) {
      continue;
    }
    dst[k] = src[k];
  }
  return dst;
}

function invariant(cond, message) {
  if (!cond) {
    throw new Error(message);
  }
}

function getCubicBeizerEpsilon(duration) {
  return (1000 / 60 / duration) / 4;
}

function Ease(js, css) {
  this.js = js;
  this.css = css;
}

function cubicBeizerEase(a, b, c, d) {
  return function(duration) {
    return new Ease(
      cubicBeizer(a, b, c, d, getCubicBeizerEpsilon(duration)),
      'cubic-bezier(' + a + ', ' + b + ', ' + c + ', ' + d + ')'
    );
  };
}

var EasingFunctions = {
  ease: cubicBeizerEase(0.25, 0.1, 0.25, 1.0),
  linear: cubicBeizerEase(0.0, 0.0, 1.0, 1.0),
  easeIn: cubicBeizerEase(0.42, 0, 1.0, 1.0),
  easeOut: cubicBeizerEase(0, 0, 0.58, 1.0),
  easeInOut: cubicBeizerEase(0.42, 0, 0.58, 1.0)
};

// Basically a keyframe
function TweenStep(time, value, ease) {
  this.time = time; // time since previous TweenStep
  this.value = value;
  this.ease = ease(time);
}

copyProperties(TweenStep.prototype, {
  /*
  getCSSKeyframeProperties: function(property) {
    var keyframe = {
      animationTimingFunction: this.ease.css
    };
    keyframe[property] = this.value;
    return keyframe;
  }
*/
});

// Factory functions
copyProperties(TweenStep, {
  ease: function(time, value, ease) {
    return new TweenStep(time, value, ease);
  },
  wait: function(time) {
    return new TweenStep(time, 0, function() { return 0; });
  }
  // TODO: can we integrate call() in here somehow?
});

// NO CALLBACKS
function TweenedValue(initialValue, steps, forceNoCSS) {
  invariant(steps.length > 0, 'You must provide at least 1 step');
  this.initialValue = initialValue;
  this.steps = steps;
  this.forceNoCSS = forceNoCSS;
  this.usedRawValue = false;
}

copyProperties(TweenedValue.prototype, {
  getRawValue: function(time) {
    this.usedRawValue = true;
    return this.getRawValueForAnimation(time);
  },
  getRawValueForAnimation: function(time) {
    // TODO: make this work with call() and wait() (not hard)

    var currentTimeInLoop = 0;
    for (var i = 0; i < this.steps.length; i++) {
      var step = this.steps[i];
      currentTimeInLoop += step.time;
      if (time <= currentTimeInLoop) {
        var lastValue = i > 0 ? this.steps[i - 1].value : this.initialValue;
        var elapsedTimeInCurrentStep = time - (currentTimeInLoop - step.time);
        return lastValue + (step.value - lastValue) * step.ease.js(elapsedTimeInCurrentStep / step.time);
      }
    }
  },
  getCSSEaseAtTime: function(time) {
    invariant(this.canUseCSS(), 'Cannot use CSS');
    var currentTime = 0;
    for (var i = 0; i < this.steps.length; i++) {
      currentTime += this.steps[i].time;
      if (time < currentTime) {
        return this.steps[i].ease.css;
      }
    }
    return this.steps[this.steps.length - 1].ease.css;
  },
  canUseCSS: function() {
    if (this.forceNoCSS || this.usedRawValue) {
      return false;
    }

    for (var i = 0; i < this.steps.length; i++) {
      var cssEase = this.steps[i].ease.css;
      if (!cssEase) {
        // Using JS easing, can't use CSS.
        return false;
      }
    }

    return true;
  },
  getTotalTime: function() {
    var totalTime = 0;
    for (i = 0; i < this.steps.length; i++) {
      totalTime += this.steps[i].time;
    }
    return totalTime;
  },
  getKeyframeTimes: function() {
    // Return keyframe times as percentages
    // First get the total runtime of this tween.
    var totalTime = this.getTotalTime();

    // Now let's get each keyframe end time as a percentage of
    // the total runtime (for css)
    // PERF TODO: this function should update the keyframe time set directly.
    var keyframeTimes = [0];
    var currentTime = 0;

    for (var i = 0; i < this.steps.length; i++) {
      currentTime += this.steps[i].time;
      // PERF TODO: push eases here
      keyframeTimes.push(currentTime / totalTime);
    }
    return keyframeTimes;
  }
  /*
  getCSS: function(property) {
    // TODO: make this work with call() and wait() (not hard)
    invariant(this.canUseCSS(), 'Cannot getCSS() if you cannot use CSS');

    var firstKeyframe = {};
    firstKeyframe[property] = this.initialValue;

    var keyframes = {
      '0%': firstKeyframe
    };

    var i;
    var totalTime = 0;
    for (i = 0; i < this.steps.length; i++) {
      totalTime += this.steps[i].time;
    }
    var currentTime = 0;
    for (i = 0; i < this.steps.length; i++) {
      var step = this.steps[i];
      currentTime += step.time;
      var pct = currentTime / totalTime;
      keyframes[(pct * 100) + '%'] = step.getCSSKeyframeProperties(property);
    }
    return {
      duration: (totalTime / 1000) + 's',
      keyframes: keyframes
    };
  }*/
});

// translate3d stuff

function updateKeyframeTimeSet(keyframeTimeSet, tweenedValue) {
  // future optimization: just have TweenedValue.getKeyframeTimes() do this w/o intermediate array/obj
  var keyframeTimes = tweenedValue.getKeyframeTimes();
  for (var i = 0; i < keyframeTimes.length; i++) {
    keyframeTimeSet[keyframeTimes[i]] = true;
  }
}

function constantTweenedValueForTranslate3d(tweenedValue, value) {
  // Often we only want to animate a subset of axes in translate3d and keep the others
  // constant. We use this function to create a constant tweenedValue with the same ease
  // as the target.
  return new TweenedValue(
    value,
    tweenedValue.steps.map(function(step) {
      // todo: hacky :(
      var newStep = new TweenStep(step.time, value, function() {});
      newStep.ease = step.ease;
      return newStep;
    })
  );
}

function getTranslate3dAnimation(xTweenedValue, yTweenedValue, zTweenedValue) {
  invariant(xTweenedValue.canUseCSS(), 'xTweenedValue cannot use CSS. Did you call getRawValue()?');
  invariant(yTweenedValue.canUseCSS(), 'yTweenedValue cannot use CSS. Did you call getRawValue()?');
  invariant(zTweenedValue.canUseCSS(), 'zTweenedValue cannot use CSS. Did you call getRawValue()?');
  var keyframeTimeSet = {};
  updateKeyframeTimeSet(keyframeTimeSet, xTweenedValue);
  updateKeyframeTimeSet(keyframeTimeSet, yTweenedValue);
  updateKeyframeTimeSet(keyframeTimeSet, zTweenedValue);
  var duration = Math.max(xTweenedValue.getTotalTime(), yTweenedValue.getTotalTime(), zTweenedValue.getTotalTime());
  var keyframes = {};
  for (var keyframeTime in keyframeTimeSet) {
    var rawTime = keyframeTime * duration;
    var cssEase = xTweenedValue.getCSSEaseAtTime(rawTime);
    invariant(cssEase, 'No CSS ease available');
    invariant(cssEase === yTweenedValue.getCSSEaseAtTime(rawTime) && cssEase === zTweenedValue.getCSSEaseAtTime(rawTime), 'CSS eases differed');
    keyframes[(keyframeTime * 100) + '%'] = {
      '-webkit-transform': 'translate3d(' + xTweenedValue.getRawValueForAnimation(rawTime) + 'px,' + yTweenedValue.getRawValueForAnimation(rawTime)  + 'px,' + zTweenedValue.getRawValueForAnimation(rawTime) + 'px)',
      '-webkit-animation-timing-function': cssEase
    };
  }
  return {
    duration: duration,
    keyframes: keyframes
  };
}

var tweens = [];

function tick() {
  var nextTweens = [];
  var now = Date.now();
  for (var i = 0; i < tweens.length; i++) {
    var tween = tweens[i];
    if (!tween.component.isMounted()) {
      continue;
    }
    var time = now - tween.start;
    if (time > tween.value.getTotalTime()) {
      continue;
    }
    var state = {};
    state[tween.key] = tween.tweenedValue.getRawValue(time);
    tween.component.setState(state);
  }
  tweens = nextTweens;
  requestAnimationFrame(tick);
}

function enqueueTween(component, key, tweenedValue) {
  tweens.push({
    component: component,
    key: key,
    tweenedValue: tweenedValue,
    start: Date.now()
  });
}

tick();

/*
var tv = new TweenedValue(
  0,
  [
    TweenStep.ease(10, 100, EasingFunctions.ease)
  ]
);

var tz = constantTweenedValueForTranslate3d(tv, 0);


console.log(getTranslate3dAnimation(tv, tz, tz));
*/
//console.log(tv.getRawValue(0));
//console.log(tv.getRawValue(5));
//console.log(tv.getRawValue(10));