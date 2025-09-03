// Top-level imports and Firebase initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5CsDh9NDb5qGcwiBQVg3fSEDaxlFiM74",
  authDomain: "messhallbooking.firebaseapp.com",
  databaseURL: "https://messhallbooking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "messhallbooking",
  storageBucket: "messhallbooking.appspot.com",
  messagingSenderId: "948107559939",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 🧼 Helper: Sanitize key for Firebase
function sanitizeKey(name) {
  return name.replace(/[.#$[\]/]/g, "_");
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Starting script');

  const db = database;

  const leftSide = document.getElementById("leftSide");
  const rightSide = document.getElementById("rightSide");

  const bookingModal = document.getElementById("bookingModal");
  const modalTableNumber = document.getElementById("modalTableNumber");
  const bookingForm = document.getElementById("bookingForm");
  const nameSelect = document.getElementById("nameSelect");
  const peopleInput = document.getElementById("peopleInput");
  const errorMessage = document.getElementById("errorMessage");
  const cancelButton = document.getElementById("cancelButton");

  const manageNamesBtn = document.getElementById("manageNamesBtn");
  const manageNamesModal = document.getElementById("manageNamesModal");
  const namesList = document.getElementById("namesList");
  const newNameInput = document.getElementById("newNameInput");
  const addNameBtn = document.getElementById("addNameBtn");
  const saveNamesBtn = document.getElementById("saveNamesBtn");
  const cancelNamesBtn = document.getElementById("cancelNamesBtn");

  const exitNameSelect = document.getElementById("exitNameSelect");
  const exitButton = document.getElementById("exitButton");

  const clearAllBtn = document.getElementById("clearAllBtn");

  let selectedTableNumber = null;
  let selectedExitTableNumber = null; // NEW: Track table for exit dropdown filtering

  const autoBookingContainer = document.createElement('div');
  autoBookingContainer.style.margin = "20px 0";
  autoBookingContainer.style.textAlign = "center";

  const autoNameSelect = document.createElement('select');
  autoNameSelect.id = "autoNameSelect";
  autoNameSelect.style.marginRight = "10px";
  autoNameSelect.style.fontSize = "18px";
  autoNameSelect.style.padding = "8px 12px";
  autoNameSelect.style.minWidth = "180px";

  const autoPaxInput = document.createElement('input');
  autoPaxInput.type = "number";
  autoPaxInput.min = "1";
  autoPaxInput.placeholder = "Number of Pax";
  autoPaxInput.style.width = "150px";
  autoPaxInput.style.marginRight = "10px";
  autoPaxInput.style.fontSize = "18px";
  autoPaxInput.style.padding = "8px 12px";

  const autoBookBtn = document.createElement('button');
  autoBookBtn.textContent = "Auto Allocate Table(s)";
  autoBookBtn.style.padding = "12px 20px";
  autoBookBtn.style.fontSize = "18px";
  autoBookBtn.style.cursor = "pointer";

  autoBookingContainer.appendChild(autoNameSelect);
  autoBookingContainer.appendChild(autoPaxInput);
  autoBookingContainer.appendChild(autoBookBtn);

  document.body.insertBefore(autoBookingContainer, document.querySelector('.hall-layout'));

  const seatCapacity = {};
  for (let i = 1; i <= 28; i++) {
    seatCapacity[i] = [16, 17, 18].includes(i) ? 36 : 30;
  }

  const bookingsRef = ref(db, 'bookings');
  const seatsTakenRef = ref(db, 'seatsTaken');
  const presetNamesRef = ref(db, 'presetNames');

  let bookings = {};
  let seatsTaken = {};
  let presetNames = [];

  autoBookBtn.disabled = true;
  manageNamesBtn.disabled = true;
  clearAllBtn.disabled = true;

  Promise.all([get(bookingsRef), get(seatsTakenRef), get(presetNamesRef)])
    .then(([bookingsSnap, seatsTakenSnap, presetNamesSnap]) => {
      bookings = bookingsSnap.exists() ? bookingsSnap.val() : {};
      seatsTaken = seatsTakenSnap.exists() ? seatsTakenSnap.val() : {};
      presetNames = presetNamesSnap.exists() ? presetNamesSnap.val() : [];

      // Sanitize keys from database
      for (const table in bookings) {
        const newTable = {};
        for (const rawName in bookings[table]) {
          const safeKey = sanitizeKey(rawName);
          newTable[safeKey] = bookings[table][rawName];
        }
        bookings[table] = newTable;
      }

      for (let i = 1; i <= 28; i++) {
        if (!(i in seatsTaken)) seatsTaken[i] = 0;
        if (!(i in bookings)) bookings[i] = {};
      }

      populateNameSelect();
      populateAutoNameSelect();
      refreshTables();

      autoBookBtn.disabled = false;
      manageNamesBtn.disabled = false;
      clearAllBtn.disabled = false;
    })
    .catch(console.error);

  onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    refreshTables();

    // NEW: update exit dropdown only for selected exit table, or clear if none
    if (selectedExitTableNumber) {
      updateExitSelectForTable(selectedExitTableNumber);
    } else {
      exitNameSelect.innerHTML = "";
    }
  });

  onValue(seatsTakenRef, (snapshot) => {
    seatsTaken = snapshot.val() || {};
    refreshTables();
  });

  onValue(presetNamesRef, (snapshot) => {
    presetNames = snapshot.val() || [];
    populateNameSelect();
    populateAutoNameSelect();
  });

  function saveData() {
    set(bookingsRef, bookings).catch(console.error);
    set(seatsTakenRef, seatsTaken).catch(console.error);
    set(presetNamesRef, presetNames).catch(console.error);
  }

  function createColumn(tableNumbers) {
    const column = document.createElement("div");
    column.classList.add("table-column");

    for (const i of tableNumbers) {
      const totalSeats = seatCapacity[i];
      const taken = seatsTaken[i] ?? 0;
      const tableBookings = bookings[i] || {};

      const table = document.createElement("div");
      table.classList.add("table");

      if (taken === 0) {
        table.classList.add("available");
      } else if (taken >= totalSeats) {
        table.classList.add("full");
      } else {
        table.classList.add("partial");
      }

      let namesText = "";
      for (const [name, seats] of Object.entries(tableBookings)) {
        namesText += `${name} (${seats})\n`;
      }

      table.innerHTML = `Table ${i}<br />${taken}/${totalSeats}` +
        (namesText ? `<br /><small style="white-space: pre-wrap;">${namesText.trim()}</small>` : "");

      table.addEventListener("click", () => openBookingModal(i));

      column.appendChild(table);
    }

    return column;
  }

  function refreshTables() {
    leftSide.innerHTML = "";
    rightSide.innerHTML = "";

    leftSide.appendChild(createColumn([15, 16, 17, 18, 19, 20, 21, 22, 23]));
    leftSide.appendChild(createColumn([24, 25, 26, 27, 28]));

    rightSide.appendChild(createColumn([1, 2, 3, 4, 5, 6, 7]));
    rightSide.appendChild(createColumn([8, 9, 10, 11, 12, 13, 14]));
  }

  function populateNameSelect() {
    nameSelect.innerHTML = "";
    presetNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      nameSelect.appendChild(option);
    });
  }

  function populateAutoNameSelect() {
    autoNameSelect.innerHTML = "";
    presetNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      autoNameSelect.appendChild(option);
    });
  }

  // NEW FUNCTION: Update exit dropdown with names only for specified table
  function updateExitSelectForTable(tableNumber) {
    exitNameSelect.innerHTML = "";

    if (!tableNumber || !bookings[tableNumber]) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "-- Select a table first --";
      exitNameSelect.appendChild(option);
      return;
    }

    const names = Object.keys(bookings[tableNumber]);

    if (names.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "-- No bookings on this table --";
      exitNameSelect.appendChild(option);
    } else {
      names.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        exitNameSelect.appendChild(option);
      });
    }
  }

  // OPEN BOOKING MODAL updated to set selectedExitTableNumber and update exit dropdown
  function openBookingModal(tableNumber) {
    selectedTableNumber = tableNumber;
    selectedExitTableNumber = tableNumber; // Track for exit dropdown filtering
    modalTableNumber.textContent = `Table ${tableNumber}`;
    errorMessage.textContent = "";
    peopleInput.value = "";
    bookingModal.style.display = "block";

    updateExitSelectForTable(tableNumber);
  }

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const selectedName = nameSelect.value;
    const pax = parseInt(peopleInput.value);

    if (!selectedName) {
      errorMessage.textContent = "Please select a squad name.";
      return;
    }
    if (isNaN(pax) || pax <= 0) {
      errorMessage.textContent = "Please enter a valid number of pax.";
      return;
    }

    const tableSeats = seatCapacity[selectedTableNumber];
    const currentTaken = seatsTaken[selectedTableNumber] || 0;

    if (currentTaken + pax > tableSeats) {
      errorMessage.textContent = `Not enough seats available. Seats left: ${tableSeats - currentTaken}`;
      return;
    }

    if (!bookings[selectedTableNumber]) {
      bookings[selectedTableNumber] = {};
    }

    // Add or update booking
    bookings[selectedTableNumber][selectedName] = (bookings[selectedTableNumber][selectedName] || 0) + pax;
    seatsTaken[selectedTableNumber] = (seatsTaken[selectedTableNumber] || 0) + pax;

    saveData();
    refreshTables();

    bookingModal.style.display = "none";

    // Update exit dropdown for selected table
    updateExitSelectForTable(selectedExitTableNumber);
  });

  // EXIT booking button handler
  exitButton.addEventListener("click", () => {
    const exitName = exitNameSelect.value;
    const tableNum = selectedExitTableNumber;

    if (!tableNum) {
      alert("Please select a table first.");
      return;
    }
    if (!exitName || !(bookings[tableNum] && bookings[tableNum][exitName])) {
      alert("Please select a valid booking to exit.");
      return;
    }

    const seats = bookings[tableNum][exitName];
    delete bookings[tableNum][exitName];
    seatsTaken[tableNum] -= seats;

    if (seatsTaken[tableNum] < 0) seatsTaken[tableNum] = 0;

    saveData();
    refreshTables();

    // Update exit dropdown for selected table
    updateExitSelectForTable(selectedExitTableNumber);
  });

  manageNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "block";
    newNameInput.value = "";
    renderNamesList();
  });

  cancelNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "none";
  });

  addNameBtn.addEventListener("click", () => {
    const newName = newNameInput.value.trim();
    if (newName && !presetNames.includes(newName)) {
      presetNames.push(newName);
      newNameInput.value = "";
      renderNamesList();
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    saveData();
    populateNameSelect();
    populateAutoNameSelect();
    manageNamesModal.style.display = "none";
  });

  function renderNamesList() {
    namesList.innerHTML = "";
    presetNames.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      li.style.cursor = "pointer";
      li.title = "Click to remove";

      li.addEventListener("click", () => {
        const idx = presetNames.indexOf(name);
        if (idx !== -1) {
          presetNames.splice(idx, 1);
          renderNamesList();
        }
      });

      namesList.appendChild(li);
    });
  }

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings?")) {
      bookings = {};
      seatsTaken = {};
      for (let i = 1; i <= 28; i++) {
        seatsTaken[i] = 0;
        bookings[i] = {};
      }
      saveData();
      refreshTables();

      // Clear exit dropdown because no selection now
      selectedExitTableNumber = null;
      exitNameSelect.innerHTML = "";
    }
  });

  // Auto booking feature - assign tables automatically
  autoBookBtn.addEventListener("click", () => {
    const name = autoNameSelect.value;
    const pax = parseInt(autoPaxInput.value);

    if (!name) {
      alert("Please select a squad name for auto booking.");
      return;
    }
    if (isNaN(pax) || pax <= 0) {
      alert("Please enter a valid number of pax.");
      return;
    }

    const tablesToBook = [];
    let paxRemaining = pax;

    // Clear old bookings for this squad first (optional, or you can keep old)
    for (let t = 1; t <= 28; t++) {
      if (bookings[t] && bookings[t][name]) {
        seatsTaken[t] -= bookings[t][name];
        delete bookings[t][name];
      }
    }

    // Try to allocate tables until paxRemaining is 0
    for (let t = 1; t <= 28 && paxRemaining > 0; t++) {
      const totalSeats = seatCapacity[t];
      const taken = seatsTaken[t] || 0;
      const freeSeats = totalSeats - taken;

      if (freeSeats > 0) {
        const seatsToBook = Math.min(freeSeats, paxRemaining);

        if (!bookings[t]) bookings[t] = {};
        bookings[t][name] = seatsToBook;

        seatsTaken[t] = (seatsTaken[t] || 0) + seatsToBook;
        paxRemaining -= seatsToBook;
        tablesToBook.push(t);
      }
    }

    if (paxRemaining > 0) {
      alert(`Not enough seats available for ${pax} pax.`);
    }

    saveData();
    refreshTables();

    // Reset auto booking form inputs
    autoPaxInput.value = "";

    // Update exit dropdown for last allocated table (or clear)
    if (tablesToBook.length > 0) {
      selectedExitTableNumber = tablesToBook[0];
      updateExitSelectForTable(selectedExitTableNumber);
    } else {
      selectedExitTableNumber = null;
      exitNameSelect.innerHTML = "";
    }
  });
});
