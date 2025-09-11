console.log('JS loaded')

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
  // We'll replace the exit button below to clear old handlers
  const oldExitButton = document.getElementById("exitButton");

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

  // Populate exitNameSelect ONLY for the selected table bookings
  function populateExitNameSelect(tableNumber) {
    exitNameSelect.innerHTML = "";
    const names = Object.keys(bookings[tableNumber] || {});
    if (names.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No bookings";
      exitNameSelect.appendChild(option);
      exitNameSelect.disabled = true;
      exitButton.disabled = true;
    } else {
      names.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (${bookings[tableNumber][name]} seats)`;
        exitNameSelect.appendChild(option);
      });
      exitNameSelect.disabled = false;
      exitButton.disabled = false;
    }
  }

  function openBookingModal(tableNumber) {
    selectedTableNumber = tableNumber;
    modalTableNumber.textContent = `Table ${tableNumber}`;
    errorMessage.textContent = "";
    peopleInput.value = "";

    // Show current bookings for this table only (optional display element)
    const tableBookings = bookings[tableNumber] || {};
    let bookingsText = "";

    for (const [name, seats] of Object.entries(tableBookings)) {
      bookingsText += `${name}: ${seats} seats\n`;
    }

    populateExitNameSelect(tableNumber);

    bookingModal.style.display = "block";
  }

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
  });

  // EXIT BUTTON: Replace old exit button to remove any previous listeners
  const exitButton = oldExitButton.cloneNode(true);
  oldExitButton.parentNode.replaceChild(exitButton, oldExitButton);

  exitButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rawName = exitNameSelect.value.trim();
    const name = sanitizeKey(rawName);

    if (!name) {
      alert("Please select a name to exit.");
      return;
    }

    if (!selectedTableNumber) {
      alert("Please select a table first.");
      return;
    }

    const tableBookings = bookings[selectedTableNumber] || {};

    if (tableBookings[name]) {
      seatsTaken[selectedTableNumber] -= tableBookings[name];
      if (seatsTaken[selectedTableNumber] < 0) seatsTaken[selectedTableNumber] = 0;

      delete tableBookings[name];
      bookings[selectedTableNumber] = tableBookings;

      saveData();
      refreshTables();
      populateExitNameSelect(selectedTableNumber);

      alert(`${rawName} has exited and their booking on Table ${selectedTableNumber} is removed.`);
    } else {
      alert(`${rawName} has no booking on Table ${selectedTableNumber}.`);
    }
  });

  // MANUAL BOOKING FORM SUBMIT
  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!selectedTableNumber) {
      alert("Please select a table first.");
      return;
    }

    const rawName = nameSelect.value.trim();
    const seats = parseInt(peopleInput.value);

    if (!rawName) {
      errorMessage.textContent = "Please select a name.";
      return;
    }

    if (isNaN(seats) || seats <= 0) {
      errorMessage.textContent = "Please enter a valid number of seats.";
      return;
    }

    const name = sanitizeKey(rawName);

    const capacity = seatCapacity[selectedTableNumber];
    const takenSeats = seatsTaken[selectedTableNumber] || 0;
    const currentSeatsForName = bookings[selectedTableNumber]?.[name] || 0;
    const newTotal = takenSeats - currentSeatsForName + seats;

    if (newTotal > capacity) {
      errorMessage.textContent = `Not enough seats available. (${capacity - takenSeats + currentSeatsForName} seats left)`;
      return;
    }

    if (!bookings[selectedTableNumber]) bookings[selectedTableNumber] = {};
    bookings[selectedTableNumber][name] = seats;

    seatsTaken[selectedTableNumber] = newTotal;

    saveData();
    refreshTables();
    populateExitNameSelect(selectedTableNumber);

    bookingModal.style.display = "none";
  });

  // AUTO ALLOCATION LOGIC
  function autoAllocateTable(name, pax) {
    const safeName = sanitizeKey(name);
    // Clear previous booking of this name first
    for (const tableNum in bookings) {
      if (bookings[tableNum][safeName]) {
        seatsTaken[tableNum] -= bookings[tableNum][safeName];
        delete bookings[tableNum][safeName];
      }
    }

    // 1) If pax >=31, try to seat in tables 16-18 first with enough capacity
    const bigTables = [16, 17, 18];
    const otherTables = [];
    for (let i = 1; i <= 28; i++) {
      if (!bigTables.includes(i)) otherTables.push(i);
    }

    let tablesByCapacity;
if (pax >= 31) {
  const usableBigTables = bigTables.filter(t => (seatsTaken[t] || 0) === 0); // Only empty big tables
  tablesByCapacity = usableBigTables.concat(otherTables);
} else {
  tablesByCapacity = otherTables.concat(bigTables);
}

    
    let assignedTables = [];

    // Try to fit pax in already partially filled table(s)
// 1. Try to assign all pax to a single empty table
for (const t of tablesByCapacity) {
  const capacity = seatCapacity[t];
  const taken = seatsTaken[t] || 0;

  if (taken === 0 && capacity >= pax) {
    if (!bookings[t]) bookings[t] = {};
    bookings[t][safeName] = pax;
    seatsTaken[t] = pax;
    assignedTables.push(t);
    pax = 0;
    break;
  }
}

if (pax === 0) {
  saveData();
  refreshTables();
  return assignedTables;
}

// 2. If not possible, fill up empty tables (split group across empty tables only)
for (const t of tablesByCapacity) {
  if (pax === 0) break;

  const capacity = seatCapacity[t];
  const taken = seatsTaken[t] || 0;

  if (taken === 0) { // only empty tables here
    const toAssign = Math.min(pax, capacity);
    if (!bookings[t]) bookings[t] = {};
    bookings[t][safeName] = toAssign;
    seatsTaken[t] = toAssign;
    assignedTables.push(t);
    pax -= toAssign;
  }
}

if (pax === 0) {
  saveData();
  refreshTables();
  return assignedTables;
}

// 3. Finally, spillover to partially filled tables within the zone

let firstAssignedTable = null;
let spilloverZone = null;

for (const t of tablesByCapacity) {
  if (pax === 0) break;

  const capacity = seatCapacity[t];
  const taken = seatsTaken[t] || 0;
  const available = capacity - taken;

  const isZone1 = t >= 1 && t <= 14;
  const isZone2 = t >= 15 && t <= 28;

  if (available > 0) {
    if (!firstAssignedTable) {
      firstAssignedTable = t;
      spilloverZone = isZone1 ? 1 : (isZone2 ? 2 : 0);
    } else {
      if (
        (spilloverZone === 1 && !isZone1) ||
        (spilloverZone === 2 && !isZone2)
      ) {
        continue;
      }
    }

    if (!bookings[t]) bookings[t] = {};
    const toAssign = Math.min(pax, available);
    bookings[t][safeName] = (bookings[t][safeName] || 0) + toAssign;
    seatsTaken[t] = taken + toAssign;
    assignedTables.push(t);
    pax -= toAssign;
  }
}

saveData();
refreshTables();
return assignedTables;

  autoBookBtn.addEventListener("click", () => {
    const rawName = autoNameSelect.value.trim();
    const pax = parseInt(autoPaxInput.value);

    if (!rawName) {
      alert("Please select a name.");
      return;
    }

    if (isNaN(pax) || pax <= 0) {
      alert("Please enter a valid number of pax.");
      return;
    }

    const assigned = autoAllocateTable(rawName, pax);

    if (assigned.length > 0) {
      alert(`Allocated ${rawName} (${pax} pax) to table(s): ${assigned.join(", ")}`);
      autoPaxInput.value = "";
    } else {
      alert("Could not allocate seats with current availability.");
    }
  });

  // Manage Names modal logic, Clear All, etc.
  manageNamesBtn.addEventListener("click", () => {
    namesList.innerHTML = "";
    presetNames.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", () => {
        const idx = presetNames.indexOf(name);
        if (idx !== -1) {
          presetNames.splice(idx, 1);
          saveData();
          populateNameSelect();
          populateAutoNameSelect();
          li.remove();
        }
      });

      li.appendChild(deleteBtn);
      namesList.appendChild(li);
    });

    manageNamesModal.style.display = "block";
  });

  addNameBtn.addEventListener("click", () => {
    const newName = newNameInput.value.trim();
    if (newName && !presetNames.includes(newName)) {
      presetNames.push(newName);
      saveData();
      populateNameSelect();
      populateAutoNameSelect();
      newNameInput.value = "";
      alert(`Added name: ${newName}`);
    } else {
      alert("Enter a valid and unique name.");
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "none";
  });

  cancelNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "none";
  });

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings?")) {
      bookings = {};
      seatsTaken = {};
      for (let i = 1; i <= 28; i++) {
        bookings[i] = {};
        seatsTaken[i] = 0;
      }
      saveData();
      refreshTables();
      alert("All bookings cleared.");
    }
  });

  function updateExitSelectOnBookingsChange() {
    if (selectedTableNumber) {
      populateExitNameSelect(selectedTableNumber);
    }
  }

  // Accessibility improvements: close modals with ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      bookingModal.style.display = "none";
      manageNamesModal.style.display = "none";
    }
  });

  // Initial refresh
  refreshTables();
});






