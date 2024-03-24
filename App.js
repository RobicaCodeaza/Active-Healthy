'use strict';
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
    this._getPosition();
    // Functionality
    this._functionality();

    // Get data from local storage
    this._getLocalStorage();

    // Listenting to form submit and edit
    form.addEventListener('submit', function (e) {
      console.log('ENTER');
    });
    // btnEdit.addEventListener('click', this._editWorkout.bind(this));
    // Input type event listener
    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    // Listener in order to move to popup - Event delegation
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Getting the new location from search bar
    this._getNewLocation();
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    this.#initialCoords = [latitude, longitude];
    // console.log('coords old', this.#initialCoords);
    console.log('rendered again');

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

    L.tileLayer(mapURL, {
      attribution:
        'Powered by Geoapify | © OpenMapTiles © OpenStreetMap contributors',
      apiKey: this.#myAPIKey,
      mapStyle: 'osm-bright-smooth',
      maxZoom: 20,
    }).addTo(this.#map);
    // --------------------------------------------------------------
    // Using map variable to add event listeners in order to render workout on map
    this.#map.on('click', this._showForm.bind(this));
    this._resetValuesForm();
    this._renderCurrWeather.bind(this)(latitude, longitude);

    // this.#map.on('move', function (map) {
    //   console.log('MOOOVE---------------');
    //   console.log(map);
    //   const { lat, lng } = map.target._lastCenter;
    //   console.log(lat, lng);
    // });
    // Showing markers after loading map - MARKERS FROM LOCAL STORAGE
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work, false);
    });
  }
  _getWeather = async function (latitude, longitude) {
    try {
      // console.log('GET WEATHER----');
      const data = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=e87060d85dc945baacc143739232808&q=${latitude},${longitude}&aqi=no`
      );
      if (!data) throw new Error(`Problem with geocoding.${data.status}`);
      const dataJson = await data.json();
      // console.log(dataJson);
      return dataJson;
    } catch (err) {
      // console.error('ERROR IN GETTING WEATHER', err.message);
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
          'becoming sticky with muggy evenings';
        if (humidity > 65)
          return 'lots of moisture in the air, becoming oppressive';
      };
      weatherContainer.innerHTML = `
    <div class="weather__box center" id="box-temperature">
    <ion-icon class="weather-icon" name="sunny-outline"></ion-icon>
    <span class="temperature small-mr celsius">${weather.temp_c}&deg;C</span>
    <span class="temperature small-mr fahrenheit invisible"
      >${weather.temp_f}&deg;F</span
    >
    <span class="message">${weather.condition.text}</span>
  </div>
  <div class="weather__box center" id="box-feels">
    <ion-icon class="weather-icon" name="sunny-outline"></ion-icon>
    <span class="temperature celsius small-mr">${
      weather.feelslike_c
    }&deg;C</span>
    <span class="temperature small-mr fahrenheit invisible"
      >${weather.feelslike_f}&deg;F</span
    >
    <span class="message"> Feeling like </span>
    <span class="message"></span>
  </div>
  <div class="weather__box center" id = "box-humidity">
    <ion-icon class="weather-icon" name="water-outline"></ion-icon>
    <span class="humidity small-mr">Humidity = ${weather.humidity}</span>
    <span class="message">${humidityMessage(weather.humidity)}</span>
  </div>
  <div class="weather__box center" id = "box-uv">
    <ion-icon class="weather-icon" name="glasses-outline"></ion-icon>
    <span class="uv small-mr">UV = ${weather.uv}</span>
    <span class="message">${uvMessage(weather.uv)}</span>
  </div>`;
      // console.log(weatherObj.location.region);
      currentLocation.textContent = weatherObj.location.region;
    } catch (err) {
      console.error('ERROR IN GETTING WEATHER', err);
    }
  };
  _resetValuesForm(defaultSelect = 'running') {
    inputType.value = defaultSelect;
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }
  _resetForm() {
    btnEdit.classList.add('display-none');
    btnSubmit.classList.remove('display-none');
    this._hideForm();
    this._resetValuesForm();
  }
  _showForm(mapE) {
    // Showing the form
    form.classList.remove('hidden');
    inputDistance.focus();

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
    this._resetValuesForm(inputType.value);
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout = async function (e) {
    console.log('Entered submit');
    //Helper Functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPozitive = (...inputs) => inputs.every(inp => inp > 0);

    // Preventing page resetting when submiting a form
    e.preventDefault();

    // ---------------------------------
    // Get data from the form and checking if it is valid
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    const weatherObj = await this._getWeather(lat, lng);
    const weather = weatherObj.current;
    // ---------------------------------
    // Create object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if valid
      // Validation is being checked here - In order to simplify the if condition and having taken into account the difference between cadence and inputElevation
      if (
        !validInputs(distance, duration, cadence) ||
        !allPozitive(distance, duration, cadence)
      )
        return alert('Inputs have to be a pozitive number'); //Guard clause

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
      // console.log(workout);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPozitive(distance, duration)
      )
        return alert('Inputs have to be a pozitive number'); //Guard clause

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

    // ---------------------------------
    // Add new workout to object list
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

    this.#currentWorkoutObj.distance = inputDistance.value;
    this.#currentWorkoutObj.duration = inputDuration.value;
    if (this.#currentWorkoutObj.type === 'running')
      this.#currentWorkoutObj.cadence = inputCadence.value;
    if (this.#currentWorkoutObj.type === 'cycling')
      this.#currentWorkoutObj.elevationGain = inputElevation.value;
    const state = this.#currentWorkoutHtml.classList.contains('maximized');
    this.#currentWorkoutHtml.innerHTML = this._renderWorkout(
      this.#currentWorkoutObj,
      'edit',
      state
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

  _renderWorkout(workout, type, state = false) {
    // console.log('workout', workout.temperature);
    let html = `${
      type === 'new'
        ? `<li class="workout workout--${workout.type}" data-id="${workout.id}">`
        : ``
    }
    <div class="workout__options">
    <ion-icon
      name="close-circle-outline"
      class="workout__btn workout__btn--delete"
    ></ion-icon>
    <h2 class="workout__title">${workout.description}</h2>

    <ion-icon
      name="create-outline"
      class="workout__btn workout__btn--edit"
    ></ion-icon>

    <ion-icon
      name="chevron-down-circle-outline"
      class="workout__btn workout__btn--maximize"
    ></ion-icon>
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
    <div class="workout__weather ${state ? '' : 'invisible display-none'}">
    <div class="workout__weather__box">
      <ion-icon class="weather-icon" name="sunny-outline"></ion-icon>
      <span class="temperature small-mr celsius">${
        workout.temperature.temp_c
      }&deg;C</span>
      <span class="temperature small-mr fahrenheit invisible"
        >${workout.temperature.temp_f}68&deg;F</span
      >
    </div>

    <div class="workout__weather__box">
      <ion-icon class="weather-icon" name="water-outline"></ion-icon>
      <span class="humidity small-mr">Humidity = ${workout.humidity}</span>
    </div>
    <div class="workout__weather__box">
      <ion-icon
        class="weather-icon"
        name="glasses-outline"
      ></ion-icon>
      <span class="uv small-mr">UV = ${workout.uv}</span>
    </div>
  </div>
  ${type === 'new' ? ` </li>` : ``}
 `;
    if (type === 'new') containerWorkouts.insertAdjacentHTML('beforeend', html);
    if (type === 'edit') return html;
  }

  _moveToPopup(e) {
    // console.log('entered MoveToPopup Function', e.target);
    if (
      e.target.classList.contains('workout__btn--maximize') ||
      e.target.classList.contains('workout__btn--delete') ||
      e.target.classList.contains('workout__btn--edit')
    )
      return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return; // guard clause again

    const workout = this.#workouts.find(
      work => work.id === Number(workoutEl.dataset.id)
    );

    const [lat, lng] = workout.coords;
    // console.log(workout.coords);
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
    // console.log(data);
    if (!data) return; //again guard clause

    data.forEach(dataWorkout => {
      // console.log(dataWorkout);
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
      console.log(workout);
      this.#workouts.push(workout);
    });

    // Restoring our workout array because we need that data
    // this.#workouts = data;
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
      // const val = [...inputVal.split(',')][0];
      // console.log(val);
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
          // console.log(resultsObj, zoomLevel);
          const { lat, lon } = resultsObj;
          coordsNew = [lat, lon];
          // console.log(coordsNew);
          const options = { animate: true, pan: { duration: 1 } };
          _this.#map.setView(coordsNew, zoomLevel, options);
          // _this.#mapEvent = {};
          _this._showForm();
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
      // sidebar.classList.toggle('invisible');
      sidebar.classList.toggle('active');
      calcSidebarDimensions();
    };

    const functionalityWorkout = function (e) {
      const workout = e.target.closest('.workout');
      console.log(e.target);
      if (e.target.classList.contains('workout__btn--maximize')) {
        // const workout = e.target.closest('.workout');
        workout.classList.toggle('maximized');
        const workoutWeather = workout.querySelector('.workout__weather');
        workoutWeather.classList.toggle('invisible');
        workoutWeather.classList.toggle('display-none');
        e.target.classList.toggle('rotate');
      }
      if (e.target.classList.contains('workout__btn--edit')) {
        // const workout = e.target.closest('.workout');
        const workoutObj = this.#workouts.find(
          work => work.id === Number(workout.dataset.id)
        );
        btnEdit.classList.remove('display-none');
        btnSubmit.classList.add('display-none');
        this._showForm();
        this._resetValuesForm(workoutObj.type);
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
          // console.log('Cycling entered');
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
        // console.log('Entered NOT');
        autocompleteContainer.classList.remove('active');
        autocompleteContainer.classList.add('invisible');
        autocompleteContainer.querySelector('input').value = '';
        // sidebar.classList.add('invisible');
        // sidebar.classList.add('invisible');
        sidebar.classList.remove('active');

        this._resetForm.bind(this)();
      }
      if (clicked) {
        // console.log('ENTERED TRUE');
        seeMore.style.transform = 'translate(-50%, -250%)';
        movingButton.style.transform = `translate(0,0)`;
      }
    };

    const navBarFunction = function (e) {
      // console.log(this.#workouts);
      if (this.#workouts.length > 0 && e.target.closest('#See')) {
        seeWorkoutFunction();
        document
          .querySelector('.sidebar')
          .addEventListener('click', functionalityWorkout.bind(this));
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
    // deleteAllWorkouts.addEventListener('click', this.reset.bind(this));
  }

  reset() {
    localStorage.removeItem('workouts');
    // location.reload();
  }
}
