document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityPreview = document.getElementById("activity-preview");
  const previewContent = document.getElementById("participants-preview-content");

  let activitiesData = {};
  let activityCards = {};
  let selectedActivityName = "";

  function updateSelectedCard(activityName) {
    Object.entries(activityCards).forEach(([name, card]) => {
      if (name === activityName) {
        card.classList.add("selected-activity");
      } else {
        card.classList.remove("selected-activity");
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createParticipantsHtml(activityName, participants) {
    if (!participants || !participants.length) {
      return '<p class="no-participants">No participants have signed up yet.</p>';
    }

    return `<ul class="participants-list">${participants
      .map((participant) => `
        <li class="participant-item">
          <span class="participant-email">${escapeHtml(participant)}</span>
          <button
            type="button"
            class="participant-remove"
            data-activity-name="${escapeHtml(activityName)}"
            data-email="${escapeHtml(participant)}"
            aria-label="Remove ${escapeHtml(participant)} from ${escapeHtml(activityName)}"
          >
            ✕
          </button>
        </li>`)
      .join("")}</ul>`;
  }

  function attachParticipantRemoveHandlers(container) {
    container.querySelectorAll(".participant-remove").forEach((button) => {
      button.addEventListener("click", async () => {
        await unregisterParticipant(button.dataset.activityName, button.dataset.email);
      });
    });
  }

  async function unregisterParticipant(activityName, participantEmail) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(participantEmail)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    }
  }

  function renderActivityPreview(activityName) {
    if (!activityName || !activitiesData[activityName]) {
      activityPreview.classList.add("hidden");
      previewContent.innerHTML = "";
      return;
    }

    const details = activitiesData[activityName];
    const participantsHtml = createParticipantsHtml(activityName, details.participants);

    previewContent.innerHTML = `
      <p><strong>Participants signed up:</strong></p>
      ${participantsHtml}
    `;
    attachParticipantRemoveHandlers(previewContent);
    activityPreview.classList.remove("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      activitiesData = activities;
      selectedActivityName = activitySelect.value;

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHtml = createParticipantsHtml(name, details.participants);

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsHtml}
          </div>
        `;

        activityCard.addEventListener("click", () => {
          activitySelect.value = name;
          selectedActivityName = name;
          updateSelectedCard(name);
          renderActivityPreview(name);
        });

        activitiesList.appendChild(activityCard);
        attachParticipantRemoveHandlers(activityCard);
        activityCards[name] = activityCard;

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (selectedActivityName) {
        activitySelect.value = selectedActivityName;
      }
      updateSelectedCard(selectedActivityName);
      renderActivityPreview(selectedActivityName);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitySelect.addEventListener("change", () => {
    selectedActivityName = activitySelect.value;
    updateSelectedCard(selectedActivityName);
    renderActivityPreview(selectedActivityName);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        activitySelect.value = activity;
        selectedActivityName = activity;
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
