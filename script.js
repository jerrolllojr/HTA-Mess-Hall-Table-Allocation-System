document.addEventListener('DOMContentLoaded', () => {
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

// --- AUTO BOOK UI Elements ---
// We'll create them dynamically and insert above the hall layout
const autoBookingContainer = document.createElement('div');
autoBookingContainer.style.margin = "20px 0";
autoBookingContainer.style.textAlign = "center";

const autoNameSelect = document.createElement('select');
autoNameSelect.id = "autoNameSelect";
autoNameSelect.style.marginRight = "10px";
autoNameSelect.style.fontSize = "18px";      // Bigger font size
autoNameSelect.style.padding = "8px 12px";   // Padding for bigger box
autoNameSelect.style.minWidth = "180px";     // Wider dropdown

const autoPaxInput = document.createElement('input');
autoPaxInput.type = "number";
autoPaxInput.min = "1";
autoPaxInput.placeholder = "Number of Pax";
autoPaxInput.style.width = "150px";          // Wider input box
autoPaxInput.style.marginRight = "10px";
autoPaxInput.style.fontSize = "18px";        // Bigger font size
autoPaxInput.style.padding = "8px 12px";     // Padding for bigger input

const autoBookBtn = document.createElement('button');
autoBookBtn.textContent = "Auto Allocate Table(s)";
autoBookBtn.style.padding = "12px 20px";     // Bigger button padding
autoBookBtn.style.fontSize = "18px";         // Bigger font size
autoBookBtn.style.cursor = "pointer";        // Pointer cursor on hover

autoBookingContainer.appendChild(autoNameSelect);
autoBookingContainer.appendChild(autoPaxInput);
autoBookingContainer.appendChild(autoBookBtn);

document.body.insertBefore(autoBookingContainer, document.querySelector('.hall-layout'));

  // Load data from localStorage or initialize defaults
  let presetNames = JSON.parse(localStorage.getItem('presetNames')) || [
    "CC4/25", "C5/24", "C1/25", "C2/25", "C3/25", "C4/25", "C5/25", "C6/25", "C7/25", "C8/25",
    "R2/25", "R3/25", "R4/25", "R5/25", "R6/25", "R7/25", "R8/25", "R9/25", "R10/25",
    "NS26", "NS27", "NS28", "NS29", "NS30", "NS31", "NS32", "NS33", "NS34", "NS35",
    "NS36", "NS37", "NS38", "NS39", "NS40", "NS41", "NS42", "NS43", "NS44", "NS45",
    "NS46", "NS47", "NS48", "NS49", "NS50",
    "OCT/01", "OCT/02", "OCT/03", "OCT/04", "SPTI-02", "SPTI-03", "ICA INSP 03/25", "ICA INSP 04/25",
    "ICA INSP 05/25", "ICA INSP 06/25", "ICA INSP 07/25", "ICA SGT 03/25", "ICA SGT 04/25", "ICA SGT 05/25", "ICA SGT 06/25", "ICA Alpha", "ICA Bravo", "ICA Charlie"
  ];

  const seatCapacity = {};
  for (let i = 1; i <= 28; i++) {
    seatCapacity[i] = [16, 17, 18].includes(i) ? 36 : 30;
  }

  // seatsTaken and bookings stored in localStorage
  let seatsTaken = JSON.parse(localStorage.getItem('seatsTaken')) || {};
  let bookings = JSON.parse(localStorage.getItem('bookings')) || {};

  // Initialize empty bookings and seatsTaken for tables if missing
  for (let i = 1; i <= 28; i++) {
    if (!(i in seatsTaken)) seatsTaken[i] = 0;
    if (!(i in bookings)) bookings[i] = {};
  }

  // Create columns of tables with given numbers
  function createColumn(tableNumbers) {
    const column = document.createElement("div");
    column.classList.add("table-column");

    for (const i of tableNumbers) {
      const totalSeats = seatCapacity[i];
      const taken = seatsTaken[i] ?? 0;
      const tableBookings = bookings[i];

      const table = document.createElement("div");
      table.classList.add("table");

      if (taken === 0) {
        table.classList.add("available");
      } else if (taken >= totalSeats) {
        table.classList.add("full");
      } else {
        table.classList.add("partial");
      }

      // Show table number, seats taken/total and booked names with seat counts
      let namesText = "";
      for (const [name, seats] of Object.entries(tableBookings)) {
        namesText += `${name} (${seats})\n`;
      }
      table.innerHTML = `Table ${i}<br />${taken}/${totalSeats}` +
        (namesText ? `<br /><small style="white-space: pre-wrap;">${namesText.trim()}</small>` : "");

      // Allow opening modal for all tables to enable exit even if full
      table.addEventListener("click", () => openBookingModal(i));

      column.appendChild(table);
    }

    return column;
  }

  function refreshTables() {
    leftSide.innerHTML = "";
    rightSide.innerHTML = "";

    // Left side columns
    leftSide.appendChild(createColumn([15, 16, 17, 18, 19, 20, 21, 22, 23]));
    leftSide.appendChild(createColumn([24, 25, 26, 27, 28]));

    // Right side columns
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
    modalTableNumber.textContent = tableNumber;
    peopleInput.value = "";
    errorMessage.textContent = "";
    populateNameSelect();
    populateExitNameSelect(tableNumber);
    bookingModal.classList.remove("hidden");
    nameSelect.focus();
  }

  function closeBookingModal() {
    bookingModal.classList.add("hidden");
    selectedTableNumber = null;
  }

  bookingForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!selectedTableNumber) return;

    const name = nameSelect.value.trim();
    const people = parseInt(peopleInput.value);

    if (!name) {
      errorMessage.textContent = "Please select a name.";
      return;
    }
    if (!people || people < 1) {
      errorMessage.textContent = "Please enter a valid number of people.";
      return;
    }

    const capacity = seatCapacity[selectedTableNumber];
    const taken = seatsTaken[selectedTableNumber];
    const tableBookings = bookings[selectedTableNumber];

    // Check available seats
    const currentSeatsByName = tableBookings[name] || 0;
    const availableSeats = capacity - taken + currentSeatsByName; // include current booking seats if exists

    if (people > availableSeats) {
      errorMessage.textContent = `Only ${availableSeats} seats available at this table.`;
      return;
    }

    // Update bookings and seatsTaken
    tableBookings[name] = (tableBookings[name] || 0) + people;
    seatsTaken[selectedTableNumber] = taken - currentSeatsByName + tableBookings[name];

    saveData();
    refreshTables();
    closeBookingModal();
  });

  cancelButton.addEventListener("click", () => {
    closeBookingModal();
  });

  exitButton.addEventListener("click", () => {
    if (!selectedTableNumber) return;
    const exitName = exitNameSelect.value;
    if (!exitName || !(exitName in bookings[selectedTableNumber])) return;

    // Remove booking for the selected name at the table
    const seatsToRemove = bookings[selectedTableNumber][exitName];
    delete bookings[selectedTableNumber][exitName];
    seatsTaken[selectedTableNumber] -= seatsToRemove;

    if (seatsTaken[selectedTableNumber] < 0) seatsTaken[selectedTableNumber] = 0;

    saveData();
    refreshTables();
    populateExitNameSelect(selectedTableNumber);

    // If no bookings remain at table, disable exit select & button
    if (Object.keys(bookings[selectedTableNumber]).length === 0) {
      exitNameSelect.disabled = true;
      exitButton.disabled = true;
    }
  });

  // Manage names modal functions
  manageNamesBtn.addEventListener("click", () => {
    openManageNamesModal();
  });

  function openManageNamesModal() {
    manageNamesModal.classList.remove("hidden");
    renderNamesList();
    newNameInput.value = "";
    newNameInput.focus();
  }

  function closeManageNamesModal() {
    manageNamesModal.classList.add("hidden");
  }

  addNameBtn.addEventListener("click", () => {
    const newName = newNameInput.value.trim();
    if (newName && !presetNames.includes(newName)) {
      presetNames.push(newName);
      renderNamesList();
      newNameInput.value = "";
      newNameInput.focus();
    }
  });

  function renderNamesList() {
    namesList.innerHTML = "";
    presetNames.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name + " ";
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.style.marginLeft = "10px";
      delBtn.addEventListener("click", () => {
        presetNames = presetNames.filter(n => n !== name);
        renderNamesList();
      });
      li.appendChild(delBtn);
      namesList.appendChild(li);
    });
  }

  saveNamesBtn.addEventListener("click", () => {
    localStorage.setItem("presetNames", JSON.stringify(presetNames));
    populateNameSelect();
    populateAutoNameSelect();
    closeManageNamesModal();
  });

  cancelNamesBtn.addEventListener("click", () => {
    closeManageNamesModal();
  });

  // Clear all bookings
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings?")) {
      for (let i = 1; i <= 28; i++) {
        bookings[i] = {};
        seatsTaken[i] = 0;
      }
      saveData();
      refreshTables();
    }
  });

  // Save seatsTaken and bookings to localStorage
  function saveData() {
    localStorage.setItem("seatsTaken", JSON.stringify(seatsTaken));
    localStorage.setItem("bookings", JSON.stringify(bookings));
  }

  // Populate autoNameSelect dropdown with presetNames
  function populateAutoNameSelect() {
    autoNameSelect.innerHTML = "";
    presetNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      autoNameSelect.appendChild(option);
    });
  }

  // --- AUTO ALLOCATION FUNCTION ---
  // PRIORITY: Allocate squads >=31 pax to 36-seat tables (16, 17, 18) first, then others
function allocateTables(name, pax) {
  if (!name || pax < 1) return { success: false, allocation: {} };

  let remainingPax = pax;
  const allocation = {};

  // Helper: allocate seats on given tables
  // If requireEmpty === true, allocate only on empty tables
  // If requireEmpty === false, allocate on partially filled or empty tables
  // But we'll add special logic outside to prioritize partially filled tables that can fit entire squad
  function allocateOnTables(tables, requireEmpty = false) {
    for (const tableNum of tables) {
      if (remainingPax <= 0) break;

      const capacity = seatCapacity[tableNum];
      const taken = seatsTaken[tableNum];
      const available = capacity - taken;

      if (available <= 0) continue;

      if (requireEmpty && taken > 0) continue;

      // Allocate as much as possible
      const allocateSeats = Math.min(remainingPax, available);

      if (allocateSeats > 0) {
        if (!bookings[tableNum]) bookings[tableNum] = {};
        bookings[tableNum][name] = (bookings[tableNum][name] || 0) + allocateSeats;
        seatsTaken[tableNum] = taken + allocateSeats;

        allocation[tableNum] = (allocation[tableNum] || 0) + allocateSeats;

        remainingPax -= allocateSeats;
      }
    }
  }

  // Decide table groups: prioritize 36-seat tables if pax >= 31
  let priorityTables = [];
  let otherTables = [];
  for (let i = 1; i <= 28; i++) {
    if (pax >= 31 && [16, 17, 18].includes(i)) {
      priorityTables.push(i);
    } else {
      otherTables.push(i);
    }
  }

  // --- NEW LOGIC ---
  // First, try to find any partially filled table that can fit entire squad at once
  // Priority on 36-seat tables for big squads
  function findSingleTableForEntireSquad(tables) {
    for (const tableNum of tables) {
      const capacity = seatCapacity[tableNum];
      const taken = seatsTaken[tableNum];
      const available = capacity - taken;

      if (available >= remainingPax && taken > 0) {
        // Allocate all at once here
        if (!bookings[tableNum]) bookings[tableNum] = {};
        bookings[tableNum][name] = (bookings[tableNum][name] || 0) + remainingPax;
        seatsTaken[tableNum] = taken + remainingPax;

        allocation[tableNum] = (allocation[tableNum] || 0) + remainingPax;

        remainingPax = 0;
        return true;
      }
    }
    return false;
  }

  // Try partially filled tables that can fit entire squad (priority tables first)
  if (!findSingleTableForEntireSquad(priorityTables)) {
    // If not allocated, try other tables too
    findSingleTableForEntireSquad(otherTables);
  }

  if (remainingPax > 0) {
    // Then allocate on empty priority tables
    allocateOnTables(priorityTables, true);
  }

  if (remainingPax > 0) {
    // Then allocate on empty other tables
    allocateOnTables(otherTables, true);
  }

  if (remainingPax > 0) {
    // Spillover partially filled priority tables
    allocateOnTables(priorityTables, false);
  }

  if (remainingPax > 0) {
    // Spillover partially filled other tables
    allocateOnTables(otherTables, false);
  }

  saveData();
  refreshTables();

  if (remainingPax > 0) {
    alert(`Not enough seats available for all ${pax} pax. Only allocated ${pax - remainingPax} seats.`);
  }

  return { success: remainingPax === 0, allocation };
}




  autoBookBtn.addEventListener("click", () => {
    const name = autoNameSelect.value;
    const pax = parseInt(autoPaxInput.value);

    if (!name) {
      alert("Please select a name.");
      return;
    }
    if (!pax || pax < 1) {
      alert("Please enter a valid number of pax.");
      return;
    }

    const result = allocateTables(name, pax);

 // Build allocation message
  let message = "";
  if (Object.keys(result.allocation).length > 0) {
    message += `Allocated seats for ${name}:\n`;
    for (const [table, seats] of Object.entries(result.allocation)) {
      message += `Table ${table}: ${seats} seat(s)\n`;
    }
  }

  if (result.success) {
    alert(message || `Successfully allocated all ${pax} seats to ${name}.`);
  } else {
    alert(
      message +
      `\nNot enough seats available for all ${pax} pax. Allocated ${
        pax - (pax - Object.values(result.allocation).reduce((a, b) => a + b, 0))
      } seat(s).`
    );
  }

    autoPaxInput.value = "";
  });

  populateNameSelect();
  populateAutoNameSelect();
  refreshTables();
});

