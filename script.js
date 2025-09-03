console.log("script.js loaded");

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
    updateExitSelectOnBookingsChange();
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

  function openBookingModal(tableNumber) {
    selectedTableNumber = tableNumber;
    modalTableNumber.textContent = `Table ${tableNumber}`;
    errorMessage.textContent = "";
    peopleInput.value = "";
    bookingModal.style.display = "block";
  }

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rawName = nameSelect.value.trim();
    const name = sanitizeKey(rawName);
    const people = parseInt(peopleInput.value);

    if (!name) {
      errorMessage.textContent = "Please select a name.";
      return;
    }

    if (!people || people < 1) {
      errorMessage.textContent = "Please enter a valid number of people.";
      return;
    }

    const tableCapacity = seatCapacity[selectedTableNumber];
    const currentTaken = seatsTaken[selectedTableNumber] ?? 0;

    if (currentTaken + people > tableCapacity) {
      errorMessage.textContent = "Not enough seats available at this table.";
      return;
    }

    if (!bookings[selectedTableNumber]) {
      bookings[selectedTableNumber] = {};
    }

    if (bookings[selectedTableNumber][name]) {
      bookings[selectedTableNumber][name] += people;
    } else {
      bookings[selectedTableNumber][name] = people;
    }

    seatsTaken[selectedTableNumber] = currentTaken + people;

    saveData();

    bookingModal.style.display = "none";
    refreshTables();
  });

  manageNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "block";
    renderNamesList();
    newNameInput.value = "";
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
      populateNameSelect();
      populateAutoNameSelect();
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    saveData();
    manageNamesModal.style.display = "none";
  });

  function renderNamesList() {
    namesList.innerHTML = "";
    presetNames.forEach((name, idx) => {
      const li = document.createElement("li");
      li.textContent = name;
      li.style.cursor = "pointer";
      li.title = "Click to remove";

      li.addEventListener("click", () => {
        if (confirm(`Remove "${name}" from the list?`)) {
          presetNames.splice(idx, 1);
          renderNamesList();
          populateNameSelect();
          populateAutoNameSelect();
        }
      });

      namesList.appendChild(li);
    });
  }
  exitButton.addEventListener("click", () => {
    const rawName = exitNameSelect.value.trim();
    const name = sanitizeKey(rawName);
    if (!name) {
      alert("Please select a name to exit.");
      return;
    }

    // Find all tables where this name is booked and remove the booking
    let updated = false;
    for (const [tableStr, bookingObj] of Object.entries(bookings)) {
      const tableNum = parseInt(tableStr);
      if (bookingObj[name]) {
        seatsTaken[tableNum] -= bookingObj[name];
        delete bookingObj[name];
        updated = true;

        if (seatsTaken[tableNum] < 0) seatsTaken[tableNum] = 0;
      }
    }

    if (updated) {
      saveData();
      refreshTables();
      updateExitSelectOnBookingsChange();
      alert(`${rawName} has exited and all their bookings are removed.`);
    } else {
      alert(`${rawName} has no current bookings.`);
    }
  });

  function updateExitSelectOnBookingsChange() {
    const currentBookedNames = new Set();

    for (const bookingObj of Object.values(bookings)) {
      for (const name of Object.keys(bookingObj)) {
        currentBookedNames.add(name);
      }
    }

    const currentValue = exitNameSelect.value;

    exitNameSelect.innerHTML = "";
    currentBookedNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      exitNameSelect.appendChild(option);
    });

    // Restore previous selection if still available
    if (currentValue && currentBookedNames.has(currentValue)) {
      exitNameSelect.value = currentValue;
    }
  }

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings and seat counts?")) {
      for (let i = 1; i <= 28; i++) {
        bookings[i] = {};
        seatsTaken[i] = 0;
      }
      saveData();
      refreshTables();
      updateExitSelectOnBookingsChange();
      alert("All bookings cleared.");
    }
  });

  // --- Auto Allocate Table(s) Algorithm ---
  autoBookBtn.addEventListener('click', () => {
    const rawName = autoNameSelect.value.trim();
    const name = sanitizeKey(rawName);
    const pax = parseInt(autoPaxInput.value);

    if (!name) {
      alert("Please select a name.");
      return;
    }

    if (!pax || pax < 1) {
      alert("Please enter a valid number of pax.");
      return;
    }

    // Clear previous bookings for this name first
    let updated = false;
    for (const [tableStr, bookingObj] of Object.entries(bookings)) {
      const tableNum = parseInt(tableStr);
      if (bookingObj[name]) {
        seatsTaken[tableNum] -= bookingObj[name];
        delete bookingObj[name];
        if (seatsTaken[tableNum] < 0) seatsTaken[tableNum] = 0;
        updated = true;
      }
    }

    if (updated) {
      // Save intermediate state to prevent overbooking in allocation
      saveData();
    }

    // Start allocating
    let remaining = pax;
    // Sort tables by available seats descending
    const tablesByAvailableSeats = Object.entries(seatsTaken).map(([tableStr, taken]) => {
      const tableNum = parseInt(tableStr);
      const capacity = seatCapacity[tableNum];
      const available = capacity - taken;
      return { tableNum, available };
    }).filter(t => t.available > 0).sort((a, b) => b.available - a.available);

    if (tablesByAvailableSeats.length === 0) {
      alert("No available seats.");
      return;
    }

    // Allocate pax to tables greedily
    for (const { tableNum, available } of tablesByAvailableSeats) {
      if (remaining <= 0) break;
      const toBook = Math.min(remaining, available);

      if (!bookings[tableNum]) bookings[tableNum] = {};

      if (bookings[tableNum][name]) {
        bookings[tableNum][name] += toBook;
      } else {
        bookings[tableNum][name] = toBook;
      }

      seatsTaken[tableNum] += toBook;
      remaining -= toBook;
    }

    if (remaining > 0) {
      alert("Not enough seats available to fulfill the entire pax.");
    }

    saveData();
    refreshTables();
    updateExitSelectOnBookingsChange();
    alert(`Auto allocation complete for ${pax} pax under "${rawName}".`);
  });

  // Utility function to sanitize Firebase keys by replacing invalid characters
  function sanitizeKey(key) {
    if (!key) return "";
    // Firebase keys cannot contain ".", "#", "$", "/", "[", or "]"
    return key.replace(/[.#$/\[\]]/g, "_");
  }
});
