const EASE_FACTOR = 2.5;

// / UI
let $extra_sim = document.getElementById('extra_sim');
let $retention = document.getElementById('retention');
let $interval_modifier = document.getElementById('interval_modifier');
let $failure_penalty = document.getElementById('failure_penalty');
let $dead_point = document.getElementById('dead_point');
let $ret_percent = document.getElementById('ret_percent');
let $im_percent = document.getElementById('im_percent');
let $fail_percent = document.getElementById('fail_percent');
let $lock_chkb = document.getElementById('lock_chkb');
let $im_desc = document.getElementById('im_desc');
let $dp_verbose = document.getElementById('dp_verbose');
let $extra_verbose = document.getElementById('extra_verbose');
let $ret_at_100_im = document.getElementById('ret_at_100_im');

document.querySelector('#simulate #retention').onchange = function() {
  let value = ensure_value(this, 0.01, 1);
  document.querySelector('#simulate #ret_percent').textContent = to_percent(value);
  update_im('simulate', !document.querySelector('#simulate #lock_chkb').checked);
};
document.querySelector('#simulate #retention').onchange();

document.querySelector('#nccalc #retention').onchange = function() {
  let value = ensure_value(this, 0.01, 1);
  document.querySelector('#nccalc #ret_percent').textContent = to_percent(value);
  update_im('nccalc', !document.querySelector('#nccalc #lock_chkb2').checked);
};
document.querySelector('#nccalc #retention').onchange();

document.querySelector('#simulate #ret_at_100_im').onchange = function() {
  ensure_value(this, 0.01, 0.9999999);
  update_im('simulate', !document.querySelector('#simulate #lock_chkb').checked);
};

document.querySelector('#nccalc #ret_at_100_im').onchange = function() {
  ensure_value(this, 0.01, 0.9999999);
  update_im('nccalc', !document.querySelector('#nccalc #lock_chkb2').checked);
};

$extra_sim.onchange = function() {
  let es = ensure_value(this, 0, null, true);
  if (es === 0) {
  	$extra_verbose.textContent = 'no extra simulation';
  } else {
    $extra_verbose.textContent = days_to_verbose(es);
  }
};
$extra_sim.onchange();

$interval_modifier.onchange = function() {
  let value = ensure_value(this, 0);
  $im_percent.textContent = to_percent(value);
};

document.querySelector('#simulate #lock_chkb').onclick = function() {
  let lock_im = !this.checked;
  update_im('simulate', lock_im);
};

document.querySelector('#nccalc #lock_chkb2').onclick = function() {
  let lock_im = !this.checked;
  update_im('nccalc', lock_im);
};

$failure_penalty.onchange = function() {
  let value = ensure_value(this, 0, 1);
  $fail_percent.textContent = to_percent(value);
};
$failure_penalty.onchange();

$dead_point.onchange = function() {
  let dp = parseInt(this.value, 10);
  dp = Math.max(0, dp);
  if (dp === 0) {
  	$dp_verbose.textContent = 'no dead point';
  } else {
    $dp_verbose.textContent = days_to_verbose(dp);
  }
};
$dead_point.onchange();

function update_im(form, lock_im) {
  document.querySelector('#'+form+' #interval_modifier').disabled = lock_im;
  document.querySelector('#'+form+' #im_desc').style.display = lock_im ? 'inline-block' : 'none';
  if (lock_im) {
    let ret = float_from_input(form, 'retention');
    let ret_at_100 = float_from_input(form, 'ret_at_100_im');
    let im = Math.log(ret)/Math.log(ret_at_100);
    document.querySelector('#'+form+' #interval_modifier').value = im;
    document.querySelector('#'+form+' #im_percent').textContent = to_percent(im);
  }
}

document.querySelector('button#simulate').onclick = simulate;
document.querySelector('button#optimize').onclick = optimize;
document.querySelector('button#calculate').onclick = NCCalculate;

// Top of page tabs
$tabmenu = document.getElementById('tabmenu');
for (let i = 0; i < $tabmenu.children.length; i++) {
  $tabmenu.children[i].onclick = function(evt) {
    $tabs = document.getElementById('tabs');
    for (let j = 0; j < $tabs.children.length; j++) {
      $tabs.children[j].style = 'display: none;';
      $tabmenu.children[j].className = '';
    }
    evt.currentTarget.className = 'active';
    $tabs.children[i].style = '';
  };
}

let chart = null;

window.chartColors = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)',
};


function days_to_verbose(d) {
  const DAYS_IN_YEAR = 365;
  const MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  years = Math.floor(d/DAYS_IN_YEAR);
  let days = d - Math.floor(years * DAYS_IN_YEAR);
  let months = 0;
  for (let i = 0; i < MONTHS.length && days > MONTHS[i]; i++) {
    months++;
    days -= MONTHS[i];
  }
  let display= (value, unit, units) => value > 0 ? `${value} ${(value === 1) ? unit : units}` : '';
  return [`${display(years, 'year', 'years')}`,
    `${display(months, 'month', 'months')}`,
    `${display(days, 'day', 'days')}`].filter((e) => e !== '').join(', ');
}

// really too complex and confusing
function days_to_verbose_complex(d) {
  const DAYS_IN_YEAR = 365.25;
  const MONTHS = function* (year) {
  	const MONTH_DURATIONS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  	for (let i = 0; i < MONTH_DURATIONS.length; i++) {
    	let duration = MONTH_DURATIONS[i];
      if (year % 4 === 0 && i===1) {
      	yield duration+1;
      } else {
      	yield duration;
      }
    }
  };
  let years = d/DAYS_IN_YEAR;
  if (years%1 === 0) years--; // no decimal -> it's a leapyears, we are in the last day of the previous year
  years = Math.floor(years);
  let days = d - Math.floor(years * DAYS_IN_YEAR);
  let months = 0;
  let month_durations = Array.from(MONTHS(years+1));
  for (let i = 0; i < month_durations.length && days > month_durations[i]; i++) {
    months++;
    days -= month_durations[i];
  }

  let display= (value, unit, units, sep='') => value > 0 ? `${value} ${(value === 1) ? unit : units}${sep}` : '';
  return [`${display(years, 'year', 'years')}`,
    `${display(months, 'month', 'months')}`,
    `${display(days, 'day', 'days')}`].filter((e) => e !== '').join(', ');
}

function ensure_value(elm, min=null, max=null, is_int=false) {
  let value = is_int ? parseInt(elm.value, 10) : parseFloat(elm.value);
  value = clamp(value, min, max);
  elm.value = value;
  return value;
}

function clamp(value, min=null, max=null) {
  if (min !== null) {
  	value = Math.max(min, value);
  }
  if (max !== null) {
  	value = Math.min(max, value);
  }
  return value;
}


function to_percent(decimal) {
  return Math.round(decimal * 100) + '%';
}

Array.prototype.shuffle = function() {
  // While there are elements in the array
  for (let counter = this.length-1; counter > 0; counter--) {
    // Pick a random index
    let index = Math.floor(Math.random() * (counter+1));

    // And swap the last element with it
    let temp = this[counter];
    this[counter] = this[index];
    this[index] = temp;
  }
};

class Card {
  constructor(settings) {
    this.settings = settings;
    this.interval = 0; // last interval
    this.due = 0; // number of day before it's due
    this.ease_factor = EASE_FACTOR; // starts with default ease_factor
  }
  update_due() {
    if (this.due > 0) this.due--;
  }
  is_due() {
    return this.due === 0;
  }
  pass() {
    this.interval = Math.round(this.interval * this.ease_factor * this.settings.interval_modifier);
    this.interval = Math.max(1, this.interval); // interval can't be lower than 1
    this.due = this.interval;
  }
  fail() {
    this.interval = Math.round(this.interval * this.settings.failure_penalty);
    this.interval = Math.max(1, this.interval); // interval can't be lower than 1
    this.due = this.interval;
    if (this.settings.use_anki_fail_factor) {
    	this.ease_factor = Math.max(1.3, this.ease_factor-0.2);
    }
  }
}

class LogEntry {
  constructor(cards, reps, reviews, dead_count, extra=false) {
    this.cards = cards;
    this.reps = reps;
    this.reviews = reviews; // number of due cards this day
    this.dead_count = dead_count; // number of cards whose interval got over the dead point
    this.extra = extra; // log after end of sim
  }
}

class Deck {
  constructor(settings, size=-1) {
    this.settings = settings;
    this.size = size;
    this.new_cards = [];
    this.reviews = [];
    this.log=[];
  }
  update_day(extra=false) {
    for (let i = 0; i < this.settings.new_card_per_day; i++) {
      if (this.size === 0) {
        break;
      }
      this.size--;
      this.new_cards.push(new Card(this.settings));
    }
    let total_reps = 0;
    let today_reviews = [];
    for (let review of this.reviews) {
    	review.update_due();
      if (review.is_due()) {
        today_reviews.push(review); // get all due cards today
      }
    }
    today_reviews.shuffle(); // randomize todays review
    let pass_count = Math.round(today_reviews.length * this.settings.retention);
    let fail_count = today_reviews.length - pass_count;
    total_reps += pass_count + fail_count*this.settings.reps_failed;
    for (let i = 0; i < today_reviews.length; i++) {
      // pass and fail match retention
      let rev = today_reviews[i];
      if (i < pass_count) {
        rev.pass();
      } else {
        rev.fail();
      }
    }


    // get the new cards and graduate them
    let today_new = this.new_cards.splice(0, this.settings.new_card_per_day);
    total_reps += today_new.length * this.settings.reps_new;
    for (let new_card of today_new) {
      new_card.pass();
      this.reviews.push(new_card);
    }

    // dead point handling
    let dead_count = 0;
    if (this.settings.dead_point > 0) {
      for (let i = this.reviews.length-1; i>=0; i--) {
        if (this.reviews[i].interval >= this.settings.dead_point) {
          this.reviews.splice(i, 1);
          dead_count++;
        }
      }
    }

    this.log.push(new LogEntry(
        today_reviews.length + today_new.length,
        Math.round(total_reps),
        today_reviews.length,
        dead_count,
        extra
    ));
  }
  simulate(days=Infinity) {
    for (let i = 0; i < days; i++) {
      this.update_day();
      if (this.size === 0) {
        break;
      }
    }
  }
}

function float_from_input(form, id) {
  let $elm = document.querySelector('#'+form+' #'+id);
  return parseFloat($elm.value);
}
function int_from_input(form, id) {
  let $elm = document.querySelector('#'+form+' #'+id);
  return parseInt($elm.value, 10);
}
function bool_from_input(form, id) {
  let $elm = document.querySelector('#'+form+' #'+id);
  return $elm.checked;
}

function disallowUndefinedProperties(obj) {
  const handler = {
    get(target, property) {
      if (property in target) {
	return target[property];
      }

      throw new Error(`Property '${property}' is not defined`);
    }
  };

  return new Proxy(obj, handler);
}

function simulate() {
  let settings = {};
  settings.deck_size = int_from_input('simulate', 'deck_size');
  settings.extra_sim = int_from_input('simulate', 'extra_sim');
  settings.retention = float_from_input('simulate', 'retention');
  settings.new_card_per_day = int_from_input('simulate', 'new_card_per_day');
  settings.interval_modifier = float_from_input('simulate', 'interval_modifier');
  settings.failure_penalty = float_from_input('simulate', 'failure_penalty');
  settings.reps_new = float_from_input('simulate', 'reps_new');
  settings.reps_failed = float_from_input('simulate', 'reps_failed');
  settings.dead_point = int_from_input('simulate', 'dead_point');
  settings.use_anki_fail_factor = bool_from_input('simulate', 'use_anki_fail_factor');

  let d = new Deck(settings, settings.deck_size);
  d.simulate();

  function get_data(deck, with_extra=false) {
    let reps=[]; let reviews=[]; let labels=[]; let deads=[];
    for (let x = 0; x<deck.log.length; x++) {
      let logentry = deck.log[x];
      if (with_extra || !logentry.extra) {
        labels.push(x+1);
        reps.push(logentry.reps);
        reviews.push(logentry.reviews);
        deads.push(logentry.dead_count);
      }
    }
    return {reps: reps, reviews: reviews, labels: labels, deads: deads};
  }
  function second_half(data) {
    return {reps: data.reps.slice(data.reps.length/2),
      reviews: data.reviews.slice(data.reviews.length/2),
      labels: data.labels.slice(data.labels.length/2),
      deads: data.deads.slice(data.deads.length/2)};
  }

  function get_stats(data) {
    return {
      max_reps: max(data.reps),
      average_reps: Math.round(mean(data.reps)),
      median_reps: Math.round(median(data.reps)),
      average_reviews: Math.round(mean(data.reviews)),
      max_reviews: max(data.reviews),
      median_reviews: Math.round(median(data.reviews)),
      average_removed: Math.round(mean(data.deads)),
      max_removed: max(data.deads),
      median_removed: Math.round(median(data.deads)),
      total_removed: data.deads.reduce((a, b) => a + b, 0),
    };
  }

  let data = get_data(d);
  let s1 = get_stats(data);
  let s2 = get_stats(second_half(data));

  let $csv = make_csv_link(d.log);

  let $output = document.querySelector('#simulate #output');
  $output.innerHTML = `
    <strong>Stats</strong>
    <table class="stats">
    <tr><th rowspan="2"></th><th colspan="3">whole data                                                        </th><th colspan="3">second half only                                                  </th></tr>
    <tr>                     <th>reps<br>per day   </th><th>reviews<br>per day   </th><th>removed<br>per day   </th><th>reps<br>per day   </th><th>reviews<br>per day   </th><th>removed<br>per day   </th></tr>
    <tr><th>maximum     </th><td>${s1.max_reps}    </td><td>${s1.max_reviews}    </td><td>${s1.max_removed}    </td><td>${s2.max_reps}    </td><td>${s2.max_reviews}    </td><td>${s2.max_removed}    </td></tr>
    <tr><th>average     </th><td>${s1.average_reps}</td><td>${s1.average_reviews}</td><td>${s1.average_removed}</td><td>${s2.average_reps}</td><td>${s2.average_reviews}</td><td>${s2.average_removed}</td></tr>
    <tr><th>median      </th><td>${s1.median_reps} </td><td>${s1.median_reviews} </td><td>${s1.median_removed} </td><td>${s2.median_reps} </td><td>${s2.median_reviews} </td><td>${s2.median_removed} </td></tr>
    </table>
    <div>Cards removed at the end of the simulation: ${s1.total_removed}</div>
    `;
  let $link= document.getElementById('link');
  $link.innerHTML = '';
  $link.appendChild($csv);

  let data_with_extra = get_data(d, true);
  if (settings.dead_point === 0) data_with_extra.deads = null;
  draw_chart(data_with_extra.labels,
      data_with_extra.reps,
      data_with_extra.reviews,
      data_with_extra.deads);
}

function NCCalculate() {
  let total_study_time_mins = int_from_input('nccalc', 'total_study_time_mins');
  let time_per_rep = int_from_input('nccalc', 'time_per_rep');
  let days_of_study = int_from_input('nccalc', 'days_of_study');
  let settings = {};
  settings.retention = float_from_input('nccalc', 'retention');
  settings.interval_modifier = float_from_input('nccalc', 'interval_modifier');
  settings.ret_at_100_im = float_from_input('nccalc', 'ret_at_100_im');
  settings.failure_penalty = float_from_input('nccalc', 'failure_penalty');
  settings.reps_new = float_from_input('nccalc', 'reps_new');
  settings.reps_failed = float_from_input('nccalc', 'reps_failed');
  settings.dead_point = int_from_input('nccalc', 'dead_point');
  settings.use_anki_fail_factor = bool_from_input('nccalc', 'use_anki_fail_factor');

  let N = 5;
  while (true) {
    settings.new_card_per_day = N;
    let deck = new Deck(settings);
    deck.simulate(days_of_study);
    let reps = [];
    for (let i = 0; i < deck.log.length; i++) {
      reps.push(deck.log[i].reps);
    }
    let m = mean(reps);
    if (m * time_per_rep > 60 * total_study_time_mins) {
      N = N - 1;
      break;
    }
    N = N + 1;
  }
  let $output = document.querySelector('#nccalc #output');
  $output.innerText = 'New Cards: ' + N;
}

function optimize() {
  let settings = disallowUndefinedProperties({});
  settings.failure_penalty = float_from_input('optimize', 'failure_penalty');
  settings.reps_new = float_from_input('optimize', 'reps_new');
  settings.reps_failed = float_from_input('optimize', 'reps_failed');
  settings.dead_point = int_from_input('optimize', 'dead_point');
  settings.use_anki_fail_factor = bool_from_input('optimize', 'use_anki_fail_factor');
  settings.ret_at_100_im = float_from_input('optimize', 'ret_at_100_im');

  let total_study_time_mins = int_from_input('optimize', 'total_study_time_mins');
  let time_per_rep = int_from_input('optimize', 'time_per_rep');

  let start_r = 60;
  let end_r = 90;
  let step_r = 1;

  let table = document.createElement('table');
  table.className = 'stats';
  let header = document.createElement('th');
  header.innerText = 'Days Simulated';
  table.appendChild(header);
  header = document.createElement('th');
  header.innerText = 'New Cards';
  table.appendChild(header);
  for (let x = start_r; x < end_r; x = x + step_r) {
    header = document.createElement('th');
    header.innerText = 'R=' + x + '%';
    table.appendChild(header);
  }

  // constant that is simply needed for simulation. Larger = more accurate but slower sims.
  settings.new_card_per_day = 30;
  for (let days = 100; days <= 1000; days = days + 100) {
    let row = document.createElement('tr');
    let d = document.createElement('td');
    d.innerText = days;
    row.appendChild(d);
    let best_er = -1;
    let lowest = 1/0;
    let means = [];
    for (let x = start_r; x < end_r; x = x + step_r) {
      settings.retention = x/100;
      settings.interval_modifier = Math.log(settings.retention)/Math.log(settings.ret_at_100_im);
      let deck = new Deck(settings);
      deck.simulate(days);
      let reps = [];
      for (let i = 0; i < deck.log.length; i++) {
        reps.push(deck.log[i].reps);
      }
      let m = mean(reps);
      means.push(m);
      if (m < lowest) {
        lowest = m;
        best_er = x;
      }
    }
    let N = 5;
    while (true) {
      settings.new_card_per_day = N;
      settings.retention = best_er/100;
      settings.interval_modifier = Math.log(settings.retention)/Math.log(settings.ret_at_100_im);
      let deck = new Deck(settings);
      deck.simulate(days);
      let reps = [];
      for (let i = 0; i < deck.log.length; i++) {
        reps.push(deck.log[i].reps);
      }
      let m = mean(reps);
      if (m * time_per_rep > 60 * total_study_time_mins) {
        N = N - 1;
        break;
      }
      N = N + 1;
    }
    d = document.createElement('td');
    d.innerText = N;
    row.appendChild(d);
    for (let i = 0; i < means.length; i++) {
      let m = means[i];
      d = document.createElement('td');
      d.innerText = m.toFixed(2);
      row.appendChild(d);
      if (m === lowest) {
        d.style = 'background: green;';
      }
    }
    table.appendChild(row);
  }
  console.log(settings);

  let $output = document.querySelector('#optimize #output');
  $output.appendChild(table);
}
// export
function make_csv_link(log) {
  let csv = 'data:text/csv;charset=utf-8,';
  csv += 'reps,reviews\r\n';
  for (let logentry of log) {
    let row = `${logentry.reps},${logentry.reviews}`;
    csv += row + '\r\n';
  }
  let encodedUri = encodeURI(csv);
  // window.open(encodedUri);
  let link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'anki_simulation.csv');
  link.innerHTML= 'Download CSV';
  return link;
}
// the stats
function max(numbers) {
  let res = null;
  for (let n of numbers) {
    if (res === null) res = n;
    else res = Math.max(res, n);
  }
  return res;
}
function mean(numbers) {
  let total = 0; let i;
  for (i = 0; i < numbers.length; i += 1) {
    total += numbers[i];
  }
  return total / numbers.length;
}
function median(numbers) {
  // median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
  let median = 0; let numsLen = numbers.length;
  numbers = numbers.slice(0); // copy to avoid mutation
  numbers.sort();

  if (numsLen % 2 === 0) { // is even
    // average of two middle numbers
    median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else { // is odd
    // middle number only
    median = numbers[(numsLen - 1) / 2];
  }

  return median;
}
function draw_chart(labels, reps, reviews, deads=null) {
  let ctx = document.getElementById('myChart').getContext('2d');
  let datasets = [
    {label: 'reps',
      fill: false,
      borderColor: window.chartColors.red,
      showLine: false,
      data: reps},
    {label: 'reviews',
      fill: false,
      borderColor: window.chartColors.blue,
      showLine: false,
      data: reviews},
  ];
  if (deads !== null) {
    datasets.push(
        {label: 'deads',
	  fill: false,
	  borderColor: window.chartColors.grey,
	  showLine: false,
	  data: deads}
    );
  }
  /* global Chart */
  if (chart !== null ) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      scales: {
        xAxes: [{
	  display: true,
	  scaleLabel: {
	    display: true,
	    labelString: 'Days',
	  },
        }],
        yAxes: [{
	  display: true,
	  scaleLabel: {
	    display: true,
	    labelString: 'Reps',
	  },
        }],
      }, /* ,
	    annotation: {
	    drawTime: 'beforeDatasetsDraw',
	    events: ['click'],
	    annotations: [{
	    type: 'line',
	    mode: 'horizontal',
	    scaleID: 'y-axis-0',
	    value: new_card_per_day,
	    borderColor: '#0000ff',
	    borderWidth: 1,
	    label: {
	    enabled: false,
	    content: 'new cards per day'
	    },
	    onClick:function(e) {
	    console.log(this, e)
	    this.options.label.enabled = true;
	    this.chartInstance.update();
	    }
	    }]
	    }*/
    },
  });
  let $result = document.querySelector('#simulate #result');
  $result.style.display = 'block';
}