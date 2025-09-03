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
    leftSide.appendChild(createColumn([15,16,17,18,19,20,21,22,23]));
    leftSide.appendChild(createColumn([24,25,26,27,28]));

    // Right side columns
    rightSide.appendChild(createColumn([1,2,3,4,5,6,7]));
    rightSide.appendChild(createColumn([8,9,10,11,12,13,14]));
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
    presetNames.forEach((name, idx) => {
      const li = document.createElement("li");
      li.textContent = name;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "X";
      deleteBtn.title = "Remove Name";
      deleteBtn.addEventListener("click", () => {
        presetNames.splice(idx, 1);
        renderNamesList();
      });

      li.appendChild(deleteBtn);
      namesList.appendChild(li);
    });
  }

  saveNamesBtn.addEventListener("click", () => {
    localStorage.setItem('presetNames', JSON.stringify(presetNames));
    closeManageNamesModal();
  });

  cancelNamesBtn.addEventListener("click", () => {
    closeManageNamesModal();
  });

  // Clear all bookings button
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings?")) {
      for (let i = 1; i <= 28; i++) {
        seatsTaken[i] = 0;
        bookings[i] = {};
      }
      saveData();
      refreshTables();
    }
  });

  function saveData() {
    localStorage.setItem('seatsTaken', JSON.stringify(seatsTaken));
    localStorage.setItem('bookings', JSON.stringify(bookings));
  }

  // Initial render
  refreshTables();
});
