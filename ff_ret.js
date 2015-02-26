// ## High-level overview
// Things happen in this order:
// 
// 1. Compute randomization parameters (which keys to press for even/odd and trial order), fill in the template <code>{{}}</code> slots that indicate which keys to press for even/odd, and show the instructions slide.
// 2. Set up the experiment sequence object.
// 3. When the subject clicks the start button, it calls <code>experiment.next()</code>
// 4. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 5. If there are more trials left, <code>experiment.next()</code> shows the next trial, records the current time for computing reaction time, and sets up a listener for a key press.
// 6. The key press listener, when it detects either a P or a Q, constructs a data object, which includes the presented stimulus number, RT (current time - start time), and whether or not the subject was correct. This entire object gets pushed into the <code>experiment.data</code> array. Then we show a blank screen and wait 500 milliseconds before calling <code>experiment.next()</code> again.

// ## Helper functions

// Shows slides. We're using jQuery here - the **$** is the jQuery selector function, which takes as input either a DOM element or a CSS selector string.
function showSlide(id) {
  // Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
	$("#"+id).show();
}

// Get a random integer less than n.
function randomInteger(n) {
	return Math.floor(Math.random()*n);
}

// Get a random element from an array (e.g., <code>random_element([4,8,7])</code> could return 4, 8, or 7). This is useful for condition randomization.
function randomElement(array) {
  return array[randomInteger(array.length)];
}

// ## Configuration settings

var stimdir = "stim/";

var allTrialOrders = [
      ["accordion","altoid","apple","backpack"],
      ["backpack","apple","altoid","accordion"] ],
    myTrialOrder = randomElement(allTrialOrders);

// Show the instructions slide -- this is what we want subjects to see first.
showSlide("instructions");

// ## The main event
// I implement the sequence as an object with properties and methods. The benefit of encapsulating everything in an object is that it's conceptually coherent (i.e. the <code>data</code> variable belongs to this particular sequence and not any other) and allows you to **compose** sequences to build more complicated experiments. For instance, if you wanted an experiment with, say, a survey, a reaction time test, and a memory test presented in a number of different orders, you could easily do so by creating three separate sequences and dynamically setting the <code>end()</code> function for each sequence so that it points to the next. **More practically, you should stick everything in an object and submit that whole object so that you don't lose data (e.g. randomization parameters, what condition the subject is in, etc). Don't worry about the fact that some of the object properties are functions -- mmturkey (the Turk submission library) will strip these out.**


var experiment = {
  // Parameters for this sequence.
  trials: myTrialOrder,
  // An array to store the data that we're collecting.
  data: [],
  // The function that gets called when the sequence is finished.
  end: function() {
    // Show the finish slide.
    showSlide("finished");
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(experiment) }, 1500);
  },
  // The work horse of the sequence - what to do on every trial.
  next: function() {
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
      experiment.end();
      return;
    }
    
    // Get the current trial - <code>shift()</code> removes the first element of the array and returns it.
    var trial_img = experiment.trials.shift();
    var trial_img_ul = stimdir + trial_img + "/e1_s1.jpg";
    var trial_img_ur = stimdir + trial_img + "/e1_s2.jpg";
    var trial_img_ll = stimdir + trial_img + "/e2_s1.jpg";
    var trial_img_lr = stimdir + trial_img + "/e2_s2.jpg";
    
    showSlide("stage");
    
    // Display the image stimulus.
    
    $(".upperleft").attr({src: trial_img_ul,
                         style: "display:initial"});
    $(".upperright").attr({src: trial_img_ur,
                         style: "display:initial"});
    $(".lowerleft").attr({src: trial_img_ll,
                         style: "display:initial"});
    $(".lowerright").attr({src: trial_img_lr,
                         style: "display:initial"});
    
    // Get the current time so we can compute reaction time later.
    var startTime = (new Date()).getTime()
    
    var clickHandler = function(event){
      
      $("img").off("click"); // Binding with 'one' is not preventing multiple click events

      // record the reaction time (current time minus start time) and which image was selected
      var endTime = (new Date()).getTime(),
          data = {
            stimulus: $(this).attr("src"),
            rt: endTime - startTime
          };
                   
      experiment.data.push(data);
                   
      // Temporarily clear the display
      $("img").attr("style", "display:none");
                   
      // Wait 500 milliseconds before starting the next trial.
      setTimeout(experiment.next, 500);
      
    };
    
    // Bind the handler
    $("img").one("click", clickHandler); //'one' is not working as intended
    
  }
}