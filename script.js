'use strict';
// prettier-ignore
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

class Workout {
  // date = new Date();
  // id = Date.now();
  clicks = 0;
  constructor(
    coords,
    location,
    distance,
    duration,
    temperature,
    humidity,
    uv,
    date,
    id
  ) {
    this.coords = coords; // [lat,long]
    this.location = location;
    this.distance = distance; //km
    this.duration = duration; //min

    this.temperature = temperature; // object of temp_c and temp_f
    this.humidity = humidity;
    this.uv = uv;
    this.date = typeof date === 'string' ? new Date(date) : date;
    this.id = id;
  }
  _setDescription() {
    this.description = `${this.type.at(0).toUpperCase()}${this.type.slice(
      1
    )} - ${this.date.getDate()}/${this.date.getMonth()}/${this.date.getFullYear()} - ${
      this.location
    }`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(
    coords,
    location,
    distance,
    duration,
    cadence,
    temperature,
    humidity,
    uv,
    date = new Date(),
    id = Date.now()
  ) {
    super(
      coords,
      location,
      distance,
      duration,
      temperature,
      humidity,
      uv,
      date,
      id
    );
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(
    coords,
    location,
    distance,
    duration,
    elevationGain,
    temperature,
    humidity,
    uv,
    date = new Date(),
    id = Date.now()
  ) {
    super(
      coords,
      location,
      distance,
      duration,
      temperature,
      humidity,
      uv,
      date,
      id
    );
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h

    this.speed = this.distance / (this.duration / 60);
    return this.pace;
  }
}

const form = document.querySelector('.form');
let formError = form.querySelector('.form-error');
const overlay = document.querySelector('.overlay');
const modal = document.querySelector('.modal-error');
const btnCloseModal = document.querySelector('.close-modal');

const btnEdit = document.querySelector('.btn--edit');
const btnSubmit = document.querySelector('.btn--submit');
const btnDelete = document.querySelector('.btn--delete');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const bottom = document.querySelector('.bottom');
// Options bar zone
let clicked = false;
const movingButton = document.querySelector('.moving-button');
const navBar = document.querySelector('.options-bar');
const movingBtnCoords = movingButton.getBoundingClientRect().x;
const movingBtnWidth = movingButton.getBoundingClientRect().width;
const seeMore = document.querySelector('.see-more');
const optionsContent = document.querySelector('.options-content');
const autocompleteContainer = document.querySelector('.autocomplete-container');
const searchBtn = document.getElementById('Search');
const returnToCurrLocBtn = document.querySelector('#Return');
const seeWorkoutsBtn = document.querySelector('#See');
const deleteAllWorkouts = document.querySelector('#Delete');
// Sidebar zone
const sidebar = document.querySelector('.sidebar');

// Weather status
const weatherContainer = document.querySelector('.weather-container');
const currentLocation = document.querySelector('.location__name');

// ----------------------------------
// APLICATION ARHITECTURE
class App {
  #map;
  #initialCoords;
  #mapLevelCountry = 7;
  #mapLevelCity = 13;
  #mapLevelStreet = 19;
  #mapEvent;
  #workouts = [];
  #myAPIKey = '0679eb7bc56b4c6699ee0f16ac1b2ab6';
  #markers = [];
  #currentWorkoutObj;
  #currentWorkoutHtml;

  constructor() {
    this.totalFormErrors = {
      inputDistance: -1,
      inputDuration: -1,
      inputCadence: -1,
      inputElevation: -1,
    };
    this._getPosition();
    // Functionality
    this._functionality();

    // Get data from local storage
    this._getLocalStorage();

    // FORM SECTION ------------------
    // Listenting to form submit and edit

    btnSubmit.addEventListener('click', this._newWorkout.bind(this));
    // btnEdit.addEventListener('click', this._editWorkout.bind(this));
    btnEdit.addEventListener('click', e => {
      this._editWorkout(e);
    });
    // Input type event listener
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    // Form pulsating animation
    form.addEventListener('animationend', function () {
      form.style.animation = '';
    });
    // ------------------

    // Listener in order to move to popup - Event delegation
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Erorrs Listeners
    btnCloseModal.addEventListener('click', this.closeModal);
    overlay.addEventListener('click', this.closeModal);

    document.addEventListener(
      'keydown',
      function (event) {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
          this.closeModal();
        }
      }.bind(this)
    );
    formError.addEventListener('animationend', function () {
      formError.style.animation = '';
      // console.log('smth-1');
    });

    // Weather informations handler
    weatherContainer.querySelectorAll('.weather__box').forEach(el =>
      el.addEventListener('mouseover', function (e) {
        const weatherDetails = el.querySelector('.weather__details');
        weatherDetails?.classList.remove('invisible');
        weatherDetails?.classList.add('active');
      })
    );
    weatherContainer.querySelectorAll('.weather__box').forEach(el =>
      el.addEventListener('mouseleave', function (e) {
        const weatherDetails = el.querySelector('.weather__details');
        weatherDetails?.classList.remove('active');
        weatherDetails?.classList.add('invisible');
      })
    );

    // Getting the new location from search bar
    this._getNewLocation();
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function (e) {
          const messageError = `    Could not get your position.
          <span class="modal-error__message__code">${e.message}(refresh Page)</span>. Verify your internet connection or location approval.`;
          this.openModal(messageError);
          return;
        }.bind(this)
      );
    }
  }
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    this.#initialCoords = [latitude, longitude];
    // console.log('coords old', this.#initialCoords);

    // LEAFLET LIBRARY - l(namespace) - methods which we can use
    // Handling clicks on map
    // Second parameter tells about the zoom
    this.#map = L.map('map').setView(this.#initialCoords, this.#mapLevelCity); // coming from leaflet library that creates an object having some certain methods

    // Map is made from more tiles coming from Openstreetmap
    // Openstreetmap - open source map
    // Leaflet works with some other maps(like google maps)
    // L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    //   attribution:
    //     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // }).addTo(this.#map);

    const mapURL = L.Browser.retina
      ? `https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}.png?apiKey=${
          this.#myAPIKey
        }`
      : `https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}@2x.png?apiKey=${
          this.#myAPIKey
        }`;

    if (!this.#map || !mapURL) {
      const messageError = `    Map occured an error.
      <span class="modal-error__message__code">Error 404</span>. Verify your internet connection or location approval.`;
      this.openModal(messageError);
      return;
    }
    L.tileLayer(mapURL, {
      attribution:
        'Powered by Geoapify | © OpenMapTiles © OpenStreetMap contributors',
      apiKey: this.#myAPIKey,
      mapStyle: 'osm-bright-smooth', // More map styles on https://apidocs.geoapify.com/docs/maps/map-tiles/
      maxZoom: 20,
    }).addTo(this.#map);
    // --------------------------------------------------------------

    // Using map variable to add event listeners in order to render workout on map

    this.#map.on('click', e => {
      inputType.removeAttribute('disabled');
      this._showForm(e);
    });
    this._resetValuesForm();
    this._renderCurrWeather.bind(this)(latitude, longitude);

    // Showing markers after loading map - MARKERS FROM LOCAL STORAGE
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work, false);
    });
  }
  _getWeather = async function (latitude, longitude) {
    try {
      // console.log('GET WEATHER----');
      const data = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=e87060d85dc945baacc143739232808&q=${latitude},${longitude}&aqi=no`
      );
      // if (!data.ok) throw new Error(`Problem with geocoding - ${data.status}`);

      const dataJson = await data.json();
      // console.log(dataJson);
      if (dataJson.error)
        throw new Error(
          `${dataJson.error.message}Error ${dataJson.error.code}`
        );
      return dataJson;
    } catch (err) {
      const messageError = `    Error getting current weather.
    <span class="modal-error__message__code">${err.message}</span>. Verify your connection or openWeather functionality.`;
      this.openModal(messageError);
      throw err;
    }
  };
  _renderCurrWeather = async function (latitude, longitude) {
    try {
      const weatherObj = await this._getWeather(latitude, longitude);
      const weather = weatherObj.current;
      const uvMessage = function (uv) {
        if (uv <= 2) return 'Low exposure';
        if (uv >= 3 && uv <= 4) return 'Moderate exposure';
        if (uv >= 5 && uv <= 6) return 'High exposure';
        if (uv >= 7 && uv <= 9) return 'Very high exposure';
      };

      const humidityMessage = function (humidity) {
        if (humidity <= 55) return 'dry and comfortable';
        if (humidity > 55 && humidity <= 65)
          return 'becoming sticky with muggy evenings';
        if (humidity > 65)
          return 'lots of moisture in the air, becoming oppressive';
      };
      //     weatherContainer.innerHTML = `
      //   <div class="weather__box center" id="box-temperature">
      //   <ion-icon class="weather-icon" name="sunny-outline"></ion-icon>
      //   <span class="temperature small-mr celsius">${weather.temp_c}&deg;C</span>
      //   <span class="temperature small-mr fahrenheit invisible"
      //     >${weather.temp_f}&deg;F</span
      //   >
      //   <span class="message">${weather.condition.text}</span>
      // </div>
      // <div class="weather__box center" id="box-feels">
      //   <ion-icon class="weather-icon" name="sunny-outline"></ion-icon>
      //   <span class="temperature celsius small-mr">${
      //     weather.feelslike_c
      //   }&deg;C</span>
      //   <span class="temperature small-mr fahrenheit invisible"
      //     >${weather.feelslike_f}&deg;F</span
      //   >
      //   <span class="message"> Feeling like </span>
      //   <span class="message"></span>
      // </div>
      // <div class="weather__box center" id = "box-humidity">
      //   <ion-icon class="weather-icon" name="water-outline"></ion-icon>
      //   <span class="humidity small-mr">Humidity = ${weather.humidity}</span>
      //   <span class="message">${humidityMessage(weather.humidity)}</span>
      // </div>
      // <div class="weather__box center" id = "box-uv">
      //   <ion-icon class="weather-icon" name="glasses-outline"></ion-icon>
      //   <span class="uv small-mr">UV = ${weather.uv}</span>
      //   <span class="message">${uvMessage(weather.uv)}</span>
      // </div>`;
      // console.log(weatherObj.location.region);
      currentLocation.textContent = weatherObj.location.region;
    } catch (err) {
      // console.log(err);
      throw err;
    }
  };

  _resetFormErrors() {
    document
      .getElementById(inputDistance.id + 'Error')
      .classList.remove('active');
    document
      .getElementById(inputDistance.id + 'Error')
      .classList.add('display-none');

    document
      .getElementById(inputDuration.id + 'Error')
      .classList.remove('active');
    document
      .getElementById(inputDuration.id + 'Error')
      .classList.add('display-none');

    document
      .getElementById(inputCadence.id + 'Error')
      .classList.remove('active');
    document
      .getElementById(inputCadence.id + 'Error')
      .classList.add('display-none');

    document
      .getElementById(inputElevation.id + 'Error')
      .classList.remove('active');
    document
      .getElementById(inputElevation.id + 'Error')
      .classList.add('display-none');
  }

  _resetTotalFormErrors(type, defaultValue = -1) {
    formError.classList.add('form__row--hidden');
    formError.classList.remove('visible');
    formError.style.animation = '';
    this.totalFormErrors.inputDistance = defaultValue;
    this.totalFormErrors.inputDuration = defaultValue;
    if (type === 'running') this.totalFormErrors.inputCadence = defaultValue;
    else this.totalFormErrors.inputCadence = -1;
    if (type === 'cycling') this.totalFormErrors.inputElevation = defaultValue;
    else this.totalFormErrors.inputElevation = -1;
  }
  _resetValuesForm(defaultSelect = 'running') {
    inputType.value = defaultSelect;

    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }
  _resetForm(defaultBehaviour = 'hide') {
    btnEdit.classList.add('display-none');
    btnSubmit.classList.remove('display-none');
    if (defaultBehaviour === 'hide') {
      this._hideForm();
    }
    this._resetValuesForm();
  }
  _showForm(mapE) {
    // Showing the form
    form.classList.remove('hidden');
    // inputDistance.focus();
    form.style.animation = 'pulsate 1s linear ';
    // In order to have global variable available to form event listener
    this.#mapEvent = mapE;
    // console.log(this.#mapEvent);
  }
  _hideForm() {
    //Empty input
    this._resetValuesForm(inputType.value);
    form.classList.add('hidden');
  }
  _toggleElevationField() {
    // console.log('entered elevation field');
    this._resetValuesForm(inputType.value);
    this._resetFormErrors();
    this._resetTotalFormErrors();
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  validInputs(...inputs) {
    // console.log(inputs);
    return inputs.every(inp => Number.isFinite(+inp));
  }
  allPozitive(...inputs) {
    return inputs.every(inp => inp > 0);
  }
  validationInputs() {
    // console.log(this.totalFormErrors);

    if (Object.values(this.totalFormErrors).some(error => error === 1)) {
      return false;
    }

    if (
      Object.values(this.totalFormErrors).reduce(function (sum, error) {
        if (error === 0) {
          return sum + 1;
        } else return sum;
      }, 0) === 3
    ) {
      // console.log('entered particular error');

      if (formError.classList.contains('visible')) {
        // formError.classList.remove('animate-slide-in');
        formError.style.animation = 'slide-out 0.25s linear';
        setTimeout(() => {
          formError.classList.add('form__row--hidden');
          formError.classList.remove('visible');
        }, 300);
      }
      return true;
    }

    return false;
  }
  _newWorkout = async function (e) {
    // Preventing page resetting when submiting a form
    e.preventDefault();

    if (!this.#mapEvent) {
      const messageError = `    Error processing workout location
  <span class="modal-error__message__code">NO #mapEvent</span>. Make sure
  to pick a location where you want to record your workout.`;
      this.openModal(messageError);
      return;
    }
    //Helper Functions

    // ---------------------------------
    // Get data from the form and checking if it is valid
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    const weatherObj = await this._getWeather(lat, lng);
    const weather = weatherObj.current;

    // const newone = formError.cloneNode(true);
    // formError.parentNode.replaceChild(newone, formError);
    // formError = newone;
    // ---------------------------------
    // Create object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if valid
      // Validation is being checked here - In order to simplify the if condition and having taken into account the difference between cadence and inputElevation
      // if (
      //   !this.validInputs(distance, duration, cadence) ||
      //   !this.allPozitive(distance, duration, cadence)
      // )
      if (!this.validationInputs()) {
        if (!formError.classList.contains('visible')) {
          formError.classList.remove('form__row--hidden'); //Guard clause
          formError.classList.add('visible');
        }
        formError.style.animation = 'slide-up-down 0.2s linear ';

        // console.log(formError.style.animationPlayState);

        console.log(this);
        return;
      }
      // console.log(this.totalFormErrors);
      workout = new Running(
        [lat, lng],
        weatherObj.location.region,
        distance,
        duration,
        cadence,
        {
          temp_c: weather.temp_c,
          temp_f: weather.temp_f,
        },
        weather.humidity,
        weather.uv
      );
      console.log(workout);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!this.validationInputs()) {
        if (!formError.classList.contains('visible')) {
          formError.classList.remove('form__row--hidden'); //Guard clause
          formError.classList.add('visible');
        }

        formError.style.animation = 'slide-up-down 0.2s linear ';
        return;
      }
      workout = new Cycling(
        [lat, lng],
        weatherObj.location.region,
        distance,
        duration,
        elevation,
        {
          temp_c: weather.temp_c,
          temp_f: weather.temp_f,
        },
        weather.humidity,
        weather.uv
      );
    }

    // console.log('Entered submit');
    this._resetTotalFormErrors.bind(this)();

    //Add new workout to object list
    // ---------------------------------
    this.#workouts.push(workout);
    // console.log('NEW WORKOUT', workout);
    // ---------------------------------
    // Render workout on map as marker
    // console.log(workout.coords, workout.distance, workout.type);
    this._renderWorkoutMarker(workout, true);

    // ---------------------------------
    // Render workout on list
    this._renderWorkout(workout, 'new');

    // ---------------------------------
    // Clear input fields and hide form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  };
  _editWorkout(e) {
    e.preventDefault();
    if (this.#currentWorkoutObj.type === 'running') {
      if (!this.validationInputs()) {
        if (!formError.classList.contains('visible')) {
          formError.classList.remove('form__row--hidden');
          formError.classList.add('visible');
        }
        formError.style.animation = 'slide-up-down 0.2s linear ';

        // console.log(formError.style.animationPlayState);

        return;
      }

      this.#currentWorkoutObj.distance = inputDistance.value;
      this.#currentWorkoutObj.duration = inputDuration.value;
      this.#currentWorkoutObj.cadence = inputCadence.value;
      this.#currentWorkoutObj.calcPace();

      // console.log(
      //   this.#currentWorkoutObj.distance,
      //   this.#currentWorkoutObj.duration,
      //   this.#currentWorkoutObj.cadence
      // );
    }
    if (this.#currentWorkoutObj.type === 'cycling') {
      if (!this.validationInputs()) {
        if (!formError.classList.contains('visible')) {
          formError.classList.remove('form__row--hidden');
          formError.classList.add('visible');
        }
        formError.style.animation = 'slide-up-down 0.2s linear ';

        return;
      }

      this.#currentWorkoutObj.distance = inputDistance.value;
      this.#currentWorkoutObj.duration = inputDuration.value;
      this.#currentWorkoutObj.elevationGain = inputElevation.value;
      this.#currentWorkoutObj.calcSpeed();
    }
    this._resetTotalFormErrors.bind(this)();
    const stateMaximized =
      this.#currentWorkoutHtml.classList.contains('maximized');
    this.#currentWorkoutHtml.innerHTML = this._renderWorkout(
      this.#currentWorkoutObj,
      'edit',
      stateMaximized
    );

    this._setLocalStorage();
    this._resetForm.bind(this)();
  }
  _renderWorkoutMarker(workout, popup) {
    const marker = L.marker(workout.coords, {
      draggable: true,
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}: ${workout.description}`
      );
    if (popup) marker.openPopup();

    this.#markers.push(marker);

    const updateCoords = function (e) {
      const { lat, lng } = e.target.getLatLng();
      marker.openPopup();
      this.#workouts[this.#markers.indexOf(marker)].coords = [lat, lng];
      // console.log(this.#markers.indexOf(marker));
    };

    this.#markers[this.#markers.length - 1].on(
      'dragend',
      updateCoords.bind(this)
    );
  }

  _renderWorkout(workout, type, stateMaximized = false) {
    // console.log('workout', workout.temperature);

    let html = `${
      type === 'new'
        ? `<li class="workout workout--${workout.type}" data-id="${workout.id}">`
        : ``
    }
    <div class="workout__options">
      <svg class="workout__btn workout__btn--delete" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
      </svg>

      <h2 class="workout__title">${workout.description}</h2>

      <svg  class="workout__btn workout__btn--edit" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"/>
      </svg>
  
      <svg class="workout__btn workout__btn--maximize" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H4m0 0v4m0-4 5 5m7-5h4m0 0v4m0-4-5 5M8 20H4m0 0v-4m0 4 5-5m7 5h4m0 0v-4m0 4-5-5"/>
      </svg>
  
  </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
 `;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">spm</span>
    </div>
`;
    }
    html += `
    <div class="workout__weather ${
      stateMaximized ? '' : 'invisible display-none'
    }">
    <div class="workout__weather__box">
      <svg class="weather-icon" aria-hidden="true" name='sunny-outline' xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fill-rule="evenodd" d="M13 3a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0V3ZM6.343 4.929A1 1 0 0 0 4.93 6.343l1.414 1.414a1 1 0 0 0 1.414-1.414L6.343 4.929Zm12.728 1.414a1 1 0 0 0-1.414-1.414l-1.414 1.414a1 1 0 0 0 1.414 1.414l1.414-1.414ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-9 4a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H3Zm16 0a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2h-2ZM7.757 17.657a1 1 0 1 0-1.414-1.414l-1.414 1.414a1 1 0 1 0 1.414 1.414l1.414-1.414Zm9.9-1.414a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414-1.414l-1.414-1.414ZM13 19a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Z" clip-rule="evenodd"/>
      </svg>

      <span class="temperature small-mr celsius">${
        workout.temperature.temp_c
      }&deg;C</span>
      <span class="temperature small-mr fahrenheit invisible"
        >${workout.temperature.temp_f}68&deg;F</span
      >
    </div>

    <div class="workout__weather__box">
      <svg xmlns="http://www.w3.org/2000/svg" name='water-outline' class="weather-icon" viewBox="0 0 200 200" xml:space="preserve"><path fill="currentColor" d="M100.382 157.898c-20.1 0-36.4-17.1-36.4-38.2 0-24.4 32.7-75.5 33-76 .4-.6 1.4-2.2 3.2-2.2h.4c1.7 0 2.6.9 3.1 1.7.3.5 33 52.1 32.9 76.6 0 21-16.3 38.1-36.2 38.1zm.1-112.3c-.1.1-.1.2-.2.3-.3.5-32.3 50.9-32.3 73.8 0 18.9 14.5 34.2 32.3 34.2h.1c17.8 0 32.2-15.3 32.3-34.1 0-19.2-23-59.8-32.2-74.2z"/><path fill="currentColor" d="M83.282 134.998c-.7 0-1.5-.4-1.8-1.1-2.3-4.9-3.5-10.2-3.5-15.7 0-13.3 10.4-35.2 19.2-51.2.5-1 1.7-1.3 2.7-.8s1.3 1.7.8 2.7c-12.2 22.3-18.7 39.4-18.7 49.3 0 5 1.1 9.6 3.1 13.9.5 1 .1 2.2-.9 2.7-.3.1-.6.2-.9.2z"/>
      </svg>
      <span class="humidity small-mr">Humidity = ${workout.humidity}</span>
    </div>
    <div class="workout__weather__box">
               
      <svg xmlns="http://www.w3.org/2000/svg" class="weather-icon" name="glasses-outline" xml:space="preserve" width="655.359" height="655.359" style="shape-rendering:geometricPrecision;   text-rendering:geometricPrecision;image-rendering:optimizeQuality;fill-rule:evenodd;clip-rule:evenodd" viewBox="0 0 6.827 6.827"><defs><style>.str0{stroke:currentColor;stroke-width:.213335;stroke-linecap:round;stroke-linejoin:round}.fil0{fill:none}</style></defs><g id="Layer_x0020_1"><g id="_436677232"><path id="_436677496" class="fil0 str0" d="m3.413 1.289 2.454 4.249H.96z"/><path id="_436676488" class="fil0 str0" d="M2.453 5V3.6c0-.083.214-.165.32 0V5c.132.065.16.066.314 0V3.517c.106-.164.273-.11.326 0v1.4c.146.145.29.183.427 0l.113-.658h.427"/><path id="_436677160" class="fil0" style="stroke:currentColor;stroke-width:.213335" d="m4.16 4.693.427-.426-.427-.427"/></g></g><path class="fil0" d="M0 0h6.827v6.827H0z"/>
      </svg>
      <span class="uv small-mr">UV = ${workout.uv}</span>
    </div>
  </div>
  ${type === 'new' ? ` </li>` : ``}
 `;
    if (type === 'new')
      containerWorkouts.insertAdjacentHTML('afterbegin', html);
    if (type === 'edit') return html;
  }

  _moveToPopup(e) {
    if (
      e.target.classList.contains('workout__btn--maximize') ||
      e.target.classList.contains('workout__btn--delete')
    )
      return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return; // guard clause again

    const workout = this.#workouts.find(
      work => work.id === Number(workoutEl.dataset.id)
    );

    const [lat, lng] = workout.coords;

    this.#markers
      .find(marker => {
        const { lat: latMarker, lng: lngMarker } = marker._latlng;
        if (lat === latMarker && lng === lngMarker) return marker;
      })
      .openPopup();
    const options = { animate: true, pan: { duration: 1 } };
    this.#map.setView(workout.coords, this.#mapLevelStreet, options);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return; //again guard clause

    data.forEach(dataWorkout => {
      const workout =
        dataWorkout.type === 'running'
          ? new Running(
              dataWorkout.coords,
              dataWorkout.location,
              dataWorkout.distance,
              dataWorkout.duration,
              dataWorkout.cadence,
              dataWorkout.temperature,
              dataWorkout.humidity,
              dataWorkout.uv,
              dataWorkout.date,
              dataWorkout.id
            )
          : new Cycling(
              dataWorkout.coords,
              dataWorkout.location,
              dataWorkout.distance,
              dataWorkout.duration,
              dataWorkout.elevationGain,
              dataWorkout.temperature,
              dataWorkout.humidity,
              dataWorkout.uv,
              dataWorkout.date,
              dataWorkout.id
            );
      this.#workouts.push(workout);
    });

    // Restoring our workout array because we need that data
    this.#workouts.forEach(work => {
      this._renderWorkout(work, 'new');
      // this._renderWorkoutMarker(work); // This will not work because map is not rendered
    });
  }

  _getNewLocation() {
    const autocompleteInput = new autocomplete.GeocoderAutocomplete(
      document.getElementById('autocomplete'),
      this.#myAPIKey,
      {}
    );
    let coordsNew;
    autocompleteInput.on('select', location => {
      // check selected location here
      const inputVal = document.querySelector(
        '.geoapify-autocomplete-input'
      ).value;
      if (!inputVal) return;

      const where = async function (_this) {
        try {
          const res = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${inputVal}&format=json&apiKey=${
              _this.#myAPIKey
            }`
          );
          const data = await res.json();

          const resultsObj = data.results[0];

          const zoomLevel =
            resultsObj.result_type === 'street'
              ? _this.#mapLevelStreet
              : resultsObj.result_type === 'city'
              ? _this.#mapLevelCity
              : _this.#mapLevelCountry;
          const { lat, lon } = resultsObj;
          coordsNew = [lat, lon];
          const options = { animate: true, pan: { duration: 1 } };
          _this.#map.setView(coordsNew, zoomLevel, options);
          _this._showForm();
          _this._resetForm('do not hide');
          _this._resetFormErrors();
          _this._resetTotalFormErrors();
        } catch {}
      };
      where(this);
    });
  }

  _functionality() {
    const calcSidebarDimensions = function () {
      const navBarHeight = navBar.getBoundingClientRect().height;
      const bottomHeight = bottom.getBoundingClientRect().height;
      sidebar.style.setProperty(
        'height',
        `calc(100vh - ${navBarHeight}px - ${bottomHeight}px)`
      );
      sidebar.style.top = `${navBarHeight}px`;
    };
    const seeWorkoutFunction = function () {
      sidebar.classList.toggle('active');
      calcSidebarDimensions();
    };

    const functionalityWorkout = function (e) {
      const workout = e.target.closest('.workout');
      // console.log(e.target);
      if (e.target.classList.contains('workout__btn--maximize')) {
        workout.classList.toggle('maximized');
        const workoutWeather = workout.querySelector('.workout__weather');
        if (!workoutWeather.classList.contains('display-none')) {
          setTimeout(() => {
            workoutWeather.classList.toggle('display-none');
          }, 250);
        } else workoutWeather.classList.toggle('display-none');
        if (workoutWeather.classList.contains('invisible')) {
          setTimeout(() => {
            workoutWeather.classList.toggle('invisible');
          }, 100);
        } else workoutWeather.classList.toggle('invisible');

        e.target.classList.toggle('rotate');
      }
      if (e.target.classList.contains('workout__btn--edit')) {
        const workoutObj = this.#workouts.find(
          work => work.id === Number(workout.dataset.id)
        );
        btnEdit.classList.remove('display-none');
        btnSubmit.classList.add('display-none');
        inputType.setAttribute('disabled', '');
        this._showForm();
        this._resetValuesForm(workoutObj.type);
        this._resetFormErrors();
        this._resetTotalFormErrors(workoutObj.type, 0);

        inputDistance.value = workoutObj.distance;
        inputDuration.value = workoutObj.duration;

        if (workoutObj.type === 'running') {
          inputElevation
            .closest('.form__row')
            .classList.add('form__row--hidden');
          inputCadence
            .closest('.form__row')
            .classList.remove('form__row--hidden');
          inputCadence.value = workoutObj.cadence;
        }
        if (workoutObj.type === 'cycling') {
          inputElevation
            .closest('.form__row')
            .classList.remove('form__row--hidden');
          inputCadence.closest('.form__row').classList.add('form__row--hidden');
          inputElevation.value = workoutObj.elevationGain;
        }
        this.#currentWorkoutObj = workoutObj;
        this.#currentWorkoutHtml = workout;
      }
      if (e.target.classList.contains('workout__btn--delete')) {
        const workoutObj = this.#workouts.find(
          work => work.id === Number(workout.dataset.id)
        );
        const workoutIndex = this.#workouts.findIndex(
          work => work.id === Number(workout.dataset.id)
        );
        const markerObj = this.#markers.find(
          marker =>
            marker._latlng.lat === workoutObj.coords[0] &&
            marker._latlng.lng === workoutObj.coords[1]
        );
        this.#map.removeLayer(markerObj);
        this.#workouts.splice(workoutIndex, 1);
        this._setLocalStorage();
        workout.remove();
        if (this.#workouts.length === 0) {
          sidebar.classList.toggle('active');
        }
      }
      if (e.target.closest('.btn--delete-all')) {
        document.querySelectorAll('.workout').forEach(work => work.remove());

        this.#workouts = [];
        this.#markers.forEach(marker => this.#map.removeLayer(marker));
        this.reset();
        sidebar.classList.toggle('active');
      }
    };

    const returnToCurrentLocation = function () {
      this.#map.setView(this.#initialCoords, this.#mapLevelCity);
    };

    const movingBtnFunction = function (e) {
      navBar.classList.toggle('active');
      // console.log('moving');
      clicked = clicked ? false : true;
      const arrow = document.querySelector('.arrow');
      arrow.firstElementChild.style.rotate = `${clicked ? 180 : 360}deg`;

      // IMPLEMENTING BAR
      seeMore.classList.toggle('invisible');
      document.querySelectorAll('.btn--options').forEach(btn => {
        btn.classList.toggle('invisible');
        btn.classList.toggle('active');
      });
      //Making sidebar visible

      if (!clicked) {
        autocompleteContainer.classList.remove('active');
        autocompleteContainer.classList.add('invisible');
        autocompleteContainer.querySelector('input').value = '';
        sidebar.classList.remove('active');

        this._resetForm.bind(this)();
      }
      if (clicked) {
        seeMore.style.transform = 'translate(-50%, -250%)';
        movingButton.style.transform = `translate(0,0)`;
      }
    };

    const navBarFunction = function (e) {
      if (this.#workouts.length > 0 && e.target.closest('#See')) {
        seeWorkoutFunction();
        document
          .querySelector('.sidebar')
          .addEventListener('click', functionalityWorkout.bind(this));
      }
      if (this.#workouts.length === 0 && e.target.closest('#See')) {
        const messageError = `
        <span class="modal-error__message__code">You don't have any workouts added</span>. Click on the map and add yours.`;
        this.openModal(messageError);
        // console.log('nothing to show');
      }
      if (e.target.closest('#Search')) {
        autocompleteContainer.classList.toggle('active');
        autocompleteContainer.classList.toggle('invisible');
      }
      if (e.target.closest('#Return')) returnToCurrentLocation.bind(this)();

      if (e.target.closest('.moving-button')) movingBtnFunction.bind(this)(e);
    };

    // IMPLEMENTATION WHEN BUTTON FOLLOWS CURSOR WHEN ENETERED navbar
    navBar.addEventListener('mousemove', e => {
      if (!clicked) {
        e.preventDefault();
        const distanceX = e.clientX - movingBtnCoords;

        movingButton.style.visibility = 'visible';
        movingButton.style.transform = `translate(${
          distanceX - movingBtnWidth / 2
        }px,60% )`;

        seeMore.style.transform = 'translate(-50%,-15%)';
      }
    });

    navBar.addEventListener('mouseleave', () => {
      if (!clicked) {
        movingButton.style.transform = `translate(0,60%)`;
        movingButton.style.visibility = 'hidden';
        seeMore.style.transform = 'translate(-50%)';
      }
    });
    navBar.addEventListener('click', navBarFunction.bind(this));
    window.addEventListener('resize', calcSidebarDimensions);
  }
  formError(x) {
    // console.log(this.totalFormErrors);
    let value = +x.target.value;
    const errorMsg = document.getElementById(x.target.id + 'Error');

    if (x.target.name === 'Elevation') value = Math.abs(value);
    if (!Number.isFinite(value) || value <= 0) {
      // console.log(x.target.id + 'Error');
      errorMsg?.classList.remove('display-none');
      setTimeout(() => {
        errorMsg?.classList.add('active');
      }, 100);

      this.totalFormErrors[x.target.id] = 1;
    } else {
      errorMsg?.classList.remove('active');
      setTimeout(() => {
        errorMsg?.classList.add('display-none');
      }, 300);
      // console.log(this.totalFormErrors);

      this.totalFormErrors[x.target.id] = 0;
    }
    if (
      Object.values(this.totalFormErrors).reduce(function (sum, error) {
        if (error === 0) {
          return sum + 1;
        } else return sum;
      }, 0) === 3 &&
      formError.classList.contains('visible')
    ) {
      // formError.classList.remove('animate-slide-in');
      formError.style.animation = 'slide-out 0.25s linear';
      setTimeout(() => {
        formError.classList.add('form__row--hidden');
        formError.classList.remove('visible');
      }, 300);
    }
  }

  openModal(message) {
    document.querySelector('.modal-error__message').innerHTML = message;
    modal.classList.remove('display-none');
    overlay.classList.remove('display-none');
  }

  closeModal() {
    modal.classList.add('display-none');
    overlay.classList.add('display-none');
  }

  reset() {
    localStorage.removeItem('workouts');
    // location.reload();
  }
}

const app = new App();
(function handleBlur() {
  inputCadence.addEventListener('blur', app.formError.bind(app));
  inputDistance.addEventListener('blur', app.formError.bind(app));
  inputDuration.addEventListener('blur', app.formError.bind(app));
  inputElevation.addEventListener('blur', app.formError.bind(app));
})();

// ----------------------------
