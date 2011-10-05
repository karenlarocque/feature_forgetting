// I'm implementing the experiment using a data structure that I call a **stream**. The insight behind streams is that many experiments consists of a sequence of largely homogeneous trials that vary based on a parameter. For instance, in this example experiment, a lot stays the same from trial to trial - we always have to present some number, the subject always has to make a response, and we always want to record that response. Of course, the trials do differ - we're displaying a different number every time. The idea behind the stream is to separate what stays the same from what differs - to factor out the constants. This results in **parametric code**, which is much easier to maintain - it's simple to add, remove, or change conditions, do randomization, and do testing.

// ## Helper functions

// Shows slides. We're using jQuery here - the **$** is the jQuery selector function, which takes as input either a DOM element or a CSS selector string.
function showSlide(id) {
	$(".slide").hide();
	$("#"+id).show();
}

showSlide("instructions");

// Get random integers.
// When called with no arguments, it returns either 0 or 1. When called with one argument, *a*, it returns a number in [*0*,*a-1*]. When called with two arguments, *a* and *b*, returns a random value in [*a*,*b*].
function random(a,b) {
	if (typeof b == "undefined") {
		a = a || 2;
		return Math.floor(Math.random()*a);
	} else {
		return Math.floor(Math.random()*(b-a+1)) + a;
	}
}

// Randomly return an element from an array. Useful for condition randomization.
Array.prototype.random = function() {
  return this[random(this.length)];
}

// ## Configuration settings
var allKeyBindings = [
  {"p": "odd", "q": "even"},
  {"p": "even", "q": "odd"}
];

var allTrialOrders = [
  [1,3,2,5,4,9,8,7,6],
  [8,4,3,7,5,6,2,1,9]
];

var myKeyBindings = allKeyBindings.random(),
    myTrialOrder = allTrialOrders.random();
    
// Fill in the instructions template. In particular,
// let the subject know which keys correspond to even/odd.
var pOdd = (myKeyBindings["p"] == "odd");
$("#odd-key").html(pOdd ? "P" : "Q");
$("#even-key").html(pOdd ? "Q" : "P");


// ## The main event
// I implement the stream as an object with properties and methods. The benefit of encapsulating everything in an object is that it's conceptually coherent (i.e. the <code>data</code> variable belongs to this particular stream and not any other) and allows you to **compose** streams to build more complicated experiments. For instance, if you wanted an experiment with, say, a survey, a reaction time test, and a memory test presented in a number of different orders, you could easily do so by creating three separate streams and dynamically setting the <code>end()</code> function for each stream.

var experiment = {
  // Parameters for this stream.
  trials: myTrialOrder,
  // Already completed parameters.
  completed: [],
  // Experiment-specific parameters - which keys map to odd/even
  keyBindings: myKeyBindings,
  // An array to store the data that we're collecting.
  data: [],
  // The function that gets called when the stream is finished.
  end: function() {
    // Show the finish slide.
    showSlide("finished");
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(experiment) }, 1500);
  },
  // The work horse of the stream - what to do on every trial.
  next: function() {
    // Get the current trial - <code>shift()</code> removes the first element of the array and returns it.
    var n = experiment.trials.shift();
    // If the current trial is undefined, it means the trials array was empty, which means that we're done, so call the end function.
    if (typeof n == "undefined") {
      return experiment.end();
    }
    
    experiment.completed.push(n);
    
    // Compute the correct answer. I'm using the so-called **ternary operator**, which is a shorthand for <code>if (...) { ... } else { ... }</code>
    var realParity = (n % 2 == 0) ? "even" : "odd";
    
    showSlide("stage");
    // Display the number stimulus.
    $("#number").html(n);
    
    // Get the current time so we can compute reaction time later.
    var startTime = (new Date()).getTime();
    
    // Listen for the keydown event. Here I'm using the jQuery keydown handler, but this has the slight disadvantage of only giving numeric key values which you then have to test for. A library like [Keymaster][keymaster], or [zen][zen] (my library, and a work in progress) lets you write simpler code like <code>key('a', function(){ alert('you pressed a!') })</code>, but I've omitted it here.
    // [keymaster]: http://github.com/madrobby/keymaster
    // [zen]: http://github.com/longouyang/zenjs
    $(document).keydown(function(event) {
      var keyCode = event.which;
      // If a valid key is pressed (code 80 is p, 81 is q)
      if (keyCode == 81 || keyCode == 80 ) {
        // ... we immediately remove the keydown handler because we don't want this function to run multiple times (e.g. if they accidentally press the key twice),.
        $(document).unbind("keydown");
        // Record the end time, which key was pressed, and what that means (even or odd).
        var endTime = (new Date()).getTime();
            key = (keyCode == 80) ? "p" : "q",
            userParity = experiment.keyBindings[key];
            
        var data = {
          stimulus: n,
          accuracy: realParity == userParity ? 1 : 0,
          rt: endTime - startTime
        };
        
        experiment.data.push(data);
        // Temporarily clear the number.
        $("#number").html("");
        // Wait 500 milliseconds before starting the next trial.
        setTimeout(experiment.next, 500);
      }
    });
  }
}