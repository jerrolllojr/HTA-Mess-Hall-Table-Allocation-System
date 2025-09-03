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

  // Auto Booking UI Elements
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

  // Seat capacity config
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
    bookingForm.reset();
    errorMessage.textContent = "";
    populateNameSelect();
    bookingModal.style.display = "block";
  }

  bookingForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = nameSelect.value.trim();
    const pax = Number(peopleInput.value);

    if (!name) {
      errorMessage.textContent = "Please select a name.";
      return;
    }
    if (isNaN(pax) || pax <= 0) {
      errorMessage.textContent = "Please enter a valid number of people.";
      return;
    }

    const capacity = seatCapacity[selectedTableNumber];
    const taken = seatsTaken[selectedTableNumber] || 0;
    if (taken + pax > capacity) {
      errorMessage.textContent = "Not enough seats available on this table.";
      return;
    }

    if (!bookings[selectedTableNumber]) bookings[selectedTableNumber] = {};
    if (!bookings[selectedTableNumber][name]) bookings[selectedTableNumber][name] = 0;
    bookings[selectedTableNumber][name] += pax;

    seatsTaken[selectedTableNumber] = taken + pax;

    saveData();
    bookingModal.style.display = "none";
    refreshTables();
  });

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
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
      renderNamesList();
      newNameInput.value = "";
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    presetNames = Array.from(new Set(presetNames)).filter(name => name.trim() !== "");
    saveData();
    manageNamesModal.style.display = "none";
    populateNameSelect();
    populateAutoNameSelect();
  });

  function renderNamesList() {
    namesList.innerHTML = "";
    presetNames.forEach((name, idx) => {
      const li = document.createElement("li");
      li.textContent = name;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", () => {
        presetNames.splice(idx, 1);
        renderNamesList();
      });

      li.appendChild(deleteBtn);
      namesList.appendChild(li);
    });
  }

  exitNameSelect.disabled = true;
  exitButton.disabled = true;

  exitButton.addEventListener("click", () => {
    const nameToRemove = exitNameSelect.value;
    if (!nameToRemove || !selectedTableNumber) return;

    if (bookings[selectedTableNumber] && bookings[selectedTableNumber][nameToRemove]) {
      const seatsToRemove = bookings[selectedTableNumber][nameToRemove];
      delete bookings[selectedTableNumber][nameToRemove];
      seatsTaken[selectedTableNumber] -= seatsToRemove;
      if (seatsTaken[selectedTableNumber] < 0) seatsTaken[selectedTableNumber] = 0;

      saveData();
      refreshTables();
      populateExitNameSelect(selectedTableNumber);
    }
  });

  // Update exitNameSelect when a table is clicked for exit action
  document.getElementById('rightSide').addEventListener('click', e => {
    if (e.target.classList.contains('table')) {
      const tableText = e.target.textContent;
      const match = tableText.match(/Table (\d+)/);
      if (match) {
        selectedTableNumber = Number(match[1]);
        populateExitNameSelect(selectedTableNumber);
      }
    }
  });

  document.getElementById('leftSide').addEventListener('click', e => {
    if (e.target.classList.contains('table')) {
      const tableText = e.target.textContent;
      const match = tableText.match(/Table (\d+)/);
      if (match) {
        selectedTableNumber = Number(match[1]);
        populateExitNameSelect(selectedTableNumber);
      }
    }
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to clear all bookings?")) return;
    bookings = {};
    seatsTaken = {};
    for (let i = 1; i <= 28; i++) {
      bookings[i] = {};
      seatsTaken[i] = 0;
    }
    saveData();
    refreshTables();
  });

  // === AUTO ALLOCATION LOGIC ===

  function autoAllocateTables(squadSize) {
    const allocations = {};
    let remaining = squadSize;

    const largeTables = [16, 17, 18];

    function assignSeats(table, seats) {
      if (!allocations[table]) allocations[table] = 0;
      allocations[table] += seats;
      remaining -= seats;
    }

    // Step 1: For squads >= 31, prioritize large tables 16-18
    if (squadSize >= 31) {
      for (const table of largeTables) {
        if (remaining <= 0) break;
        const capacity = seatCapacity[table];
        const taken = seatsTaken[table] || 0;
        const freeSeats = capacity - taken;
        if (freeSeats > 0) {
          const seatsToAssign = Math.min(remaining, freeSeats);
          assignSeats(table, seatsToAssign);
        }
      }
    }

    // Step 2: For squads <= 30 — try to seat fully in a partially filled table
    if (squadSize <= 30 && remaining > 0) {
      // Find a partially filled table that can fit entire squad
      const partialFullFitTable = Object.keys(seatCapacity)
        .map(Number)
        .find(table => {
          const capacity = seatCapacity[table];
          const taken = seatsTaken[table] || 0;
          const freeSeats = capacity - taken;
          return taken > 0 && freeSeats >= remaining;
        });

      if (partialFullFitTable) {
        assignSeats(partialFullFitTable, remaining);
      } else {
        // No partially filled table fits fully - try an empty table that fits whole squad
        const emptyFullFitTable = Object.keys(seatCapacity)
          .map(Number)
          .find(table => {
            const capacity = seatCapacity[table];
            const taken = seatsTaken[table] || 0;
            return taken === 0 && capacity >= remaining;
          });
        if (emptyFullFitTable) {
          assignSeats(emptyFullFitTable, remaining);
        }
      }
    }

    // Step 3: If still seats remain, try partially filled tables (any size)
    if (remaining > 0) {
      const partialTables = Object.keys(seatCapacity)
        .map(Number)
        .filter(t => {
          const cap = seatCapacity[t];
          const taken = seatsTaken[t] || 0;
          return taken > 0 && taken < cap;
        });

      for (const table of partialTables) {
        if (remaining <= 0) break;
        const freeSeats = seatCapacity[table] - (seatsTaken[table] || 0);
        if (freeSeats > 0) {
          const seatsToAssign = Math.min(remaining, freeSeats);
          assignSeats(table, seatsToAssign);
        }
      }
    }

    // Step 4: Assign empty tables for any remaining seats
    if (remaining > 0) {
      const emptyTables = Object.keys(seatCapacity)
        .map(Number)
        .filter(t => (seatsTaken[t] || 0) === 0);

      for (const table of emptyTables) {
        if (remaining <= 0) break;
        const capacity = seatCapacity[table];
        const seatsToAssign = Math.min(remaining, capacity);
        assignSeats(table, seatsToAssign);
      }
    }

    // Step 5: Safety check - again try partially filled tables if needed
    if (remaining > 0) {
      const partialTables = Object.keys(seatCapacity)
        .map(Number)
        .filter(t => {
          const cap = seatCapacity[t];
          const taken = seatsTaken[t] || 0;
          return taken > 0 && taken < cap;
        });

      for (const table of partialTables) {
        if (remaining <= 0) break;
        const freeSeats = seatCapacity[table] - (seatsTaken[table] || 0) - (allocations[table] || 0);
        if (freeSeats > 0) {
          const seatsToAssign = Math.min(remaining, freeSeats);
          assignSeats(table, seatsToAssign);
        }
      }
    }

    if (remaining > 0) {
      console.warn(`Not enough seats available to allocate ${squadSize} pax.`);
    }

    return allocations;
  }

  autoBookBtn.addEventListener('click', () => {
    const name = autoNameSelect.value.trim();
    const pax = Number(autoPaxInput.value);

    if (!name) {
      alert("Please select a name.");
      return;
    }
    if (isNaN(pax) || pax <= 0) {
      alert("Please enter a valid number of people.");
      return;
    }

    const allocation = autoAllocateTables(pax);

    // No allocation means no seats available
    if (Object.keys(allocation).length === 0) {
      alert("No seats available for this squad.");
      return;
    }

    // Apply allocation to bookings and seatsTaken
    for (const [tableStr, seats] of Object.entries(allocation)) {
      const table = Number(tableStr);
      if (!bookings[table]) bookings[table] = {};
      if (!bookings[table][name]) bookings[table][name] = 0;
      bookings[table][name] += seats;

      seatsTaken[table] = (seatsTaken[table] || 0) + seats;
    }

    saveData();
    refreshTables();

    autoPaxInput.value = "";
    alert(`Allocated ${pax} seats for ${name} across table(s): ${Object.keys(allocation).join(", ")}`);
  });

});
