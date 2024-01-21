(function ($) {
  const profilesKey = "lotf2023_profiles";
  const defaultProfiles = {
    current: "Default Profile",
    [profilesKey]: {
      "Default Profile": {
        checklistData: {},
      },
    },
  };
  const profiles = $.jStorage.get(profilesKey, defaultProfiles);

  jQuery(document).ready(function ($) {
    $("ul li[data-id]").each(function () {
      addCheckbox(this);
    });

    populateProfiles();

    $('input[type="checkbox"]').click(function () {
      const id = $(this).attr("id");
      const isChecked = (profiles[profilesKey][profiles.current].checklistData[
        id
      ] = $(this).prop("checked"));

      if (isChecked === true) {
        $('[data-id="' + id + '"]').addClass("completed");
      } else {
        $('[data-id="' + id + '"]').removeClass("completed");
      }

      $(this)
        .parent()
        .parent()
        .find('li > label > input[type="checkbox"]')
        .each(function () {
          const id = $(this).attr("id");
          profiles[profilesKey][profiles.current].checklistData[id] = isChecked;
          $(this).prop("checked", isChecked);
        });
      $.jStorage.set(profilesKey, profiles);

      calculateTotals();
    });

    $("#profiles").change(function () {
      profiles.current = $(this).val();
      $.jStorage.set(profilesKey, profiles);
      populateChecklists();
    });

    $("#profileAdd").click(function () {
      $("#profileModalTitle").html("Add Profile");
      $("#profileModalName").val("");
      $("#profileModalAdd").show();
      $("#profileModalUpdate").hide();
      $("#profileModalDelete").hide();
      $("#profileModal").modal("show");
    });

    $("#profileEdit").click(function () {
      $("#profileModalTitle").html("Edit Profile");
      $("#profileModalName").val(profiles.current);
      $("#profileModalAdd").hide();
      $("#profileModalUpdate").show();
      if (canDeleteProfile()) {
        $("#profileModalDelete").show();
      } else {
        $("#profileModalDelete").hide();
      }
      $("#profileModal").modal("show");
    });

    $("#profileModalAdd").click(function (event) {
      event.preventDefault();
      const profile = $.trim($("#profileModalName").val());
      if (profile.length > 0) {
        if (typeof profiles[profilesKey][profile] == "undefined") {
          profiles[profilesKey][profile] = { checklistData: {} };
        }
        profiles.current = profile;
        $.jStorage.set(profilesKey, profiles);
        populateProfiles();
        populateChecklists();
      }
    });

    $("#profileModalUpdate").click(function (event) {
      event.preventDefault();
      const newName = $.trim($("#profileModalName").val());
      if (newName.length > 0 && newName != profiles.current) {
        profiles[profilesKey][newName] =
          profiles[profilesKey][profiles.current];
        delete profiles[profilesKey][profiles.current];
        profiles.current = newName;
        $.jStorage.set(profilesKey, profiles);
        populateProfiles();
      }
      $("#profileModal").modal("hide");
    });

    $("#profileModalDelete").click(function (event) {
      event.preventDefault();
      if (!canDeleteProfile()) {
        return;
      }
      if (!confirm("Are you sure?")) {
        return;
      }
      delete profiles[profilesKey][profiles.current];
      profiles.current = getFirstProfile();
      $.jStorage.set(profilesKey, profiles);
      populateProfiles();
      populateChecklists();
      $("#profileModal").modal("hide");
    });

    $("#toggleCollapseAll").click(function () {
      let newState;
      $('section [data-bs-toggle="collapse"]').each(function () {
        const collapsed_key = $(this).attr("href");

        if (newState === undefined) {
          newState =
            !profiles[profilesKey][profiles.current].collapsed[collapsed_key];
        }

        if (newState) {
          $(collapsed_key).collapse("hide");
        } else {
          $(collapsed_key).collapse("show");
        }

        profiles[profilesKey][profiles.current].collapsed[collapsed_key] =
          newState;
      });

      $.jStorage.set(profilesKey, profiles);
    });

    $("#toggleCompleted").click(function () {
      const newState =
        !profiles[profilesKey][profiles.current].filters["completed"];
      profiles[profilesKey][profiles.current].filters["completed"] = newState;
      $("body").toggleClass("hide_completed", newState);
      $.jStorage.set(profilesKey, profiles);
    });

    $("#toggleEquipment").click(function () {
      const newState =
        !profiles[profilesKey][profiles.current].filters["equipment"];
      profiles[profilesKey][profiles.current].filters["equipment"] = newState;
      $("body").toggleClass("hide_equipment", newState);
      $.jStorage.set(profilesKey, profiles);
    });

    $("#resetPlaythrough").click(function () {
      if (!confirm("Are you sure?")) {
        return;
      }

      const { checklistData } = profiles[profilesKey][profiles.current];

      for (let key in checklistData) {
        if (key.startsWith("playthrough")) {
          $('[data-id="' + key + '"]').removeClass("completed");
          $('[data-id="' + key + '"] input[type="checkbox"]').prop(
            "checked",
            false
          );

          delete checklistData[key];
        }
      }

      profiles[profilesKey][profiles.current].checklistData = checklistData;
      $.jStorage.set(profilesKey, profiles);

      window.scrollTo({ top: 0, behavior: "instant" });

      calculateTotals();
    });

    $('[data-bs-toggle="tab"]').click(function () {
      window.scrollTo({ top: 0, behavior: "instant" });

      const attributeValue = $(this)
        .attr("data-bs-target")
        .replace(/-tab-pane$/, "")
        .replace(/^#/, "");

      window.history.replaceState(null, null, `?tab=${attributeValue}`);
    });

    $('section [data-bs-toggle="collapse"]').click(function () {
      const collapsed_key = $(this).attr("href");
      const saved_tab_state =
        !!profiles[profilesKey][profiles.current].collapsed[collapsed_key];

      profiles[profilesKey][profiles.current].collapsed[collapsed_key] =
        !saved_tab_state;

      $.jStorage.set(profilesKey, profiles);
    });

    restoreState();

    calculateTotals();
  });

  async function restoreState() {
    const triggerTabList = document.querySelectorAll("#tabs button");
    triggerTabList.forEach((triggerEl) => {
      const tabTrigger = new bootstrap.Tab(triggerEl);

      triggerEl.addEventListener("click", (event) => {
        event.preventDefault();
        tabTrigger.show();
      });
    });

    if (!profiles[profilesKey][profiles.current].collapsed) {
      profiles[profilesKey][profiles.current].collapsed = {};
    }

    if (!profiles[profilesKey][profiles.current].filters) {
      profiles[profilesKey][profiles.current].filters = {};
    }

    if (profiles[profilesKey][profiles.current].filters["completed"]) {
      $("body").addClass("hide_completed");
    }

    if (profiles[profilesKey][profiles.current].filters["equipment"]) {
      $("body").addClass("hide_equipment");
    }

    $("section .collapse").each(function (_, element) {
      const collapsed_key = `#${$(this).attr("id")}`;
      const saved_tab_state =
        profiles[profilesKey][profiles.current].collapsed[collapsed_key];

      new bootstrap.Collapse(element, { toggle: saved_tab_state });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const currentTab = getURLParameterValue("tab") || "home";
    const triggerEl = document.querySelector(
      `[data-bs-target="#${currentTab}-tab-pane"]`
    );
    bootstrap.Tab.getInstance(triggerEl).show();

    const hash = window.location.hash;

    if (hash) {
      const element = document.querySelector(hash);

      if (element) {
        element.scrollIntoView();
      }
    }
  }

  function populateProfiles() {
    $("#profiles").empty();
    $.each(profiles[profilesKey], function (index) {
      $("#profiles").append(
        $("<option></option>").attr("value", index).text(index)
      );
    });
    $("#profiles").val(profiles.current);
  }

  function populateChecklists() {
    $('input[type="checkbox"]').prop("checked", false);
    $.each(
      profiles[profilesKey][profiles.current].checklistData,
      function (index, value) {
        $("#" + index).prop("checked", value);
      }
    );
    calculateTotals();
  }

  function calculateTotals() {
    $('[id$="_overall_total"]').each(function () {
      const type = this.id.match(/(.*)_overall_total/)[1];
      let overallCount = 0,
        overallChecked = 0;
      $('[id^="' + type + '_totals_"]').each(function () {
        const regex = new RegExp(type + "_totals_(.*)");
        const regexFilter = new RegExp("^playthrough_(.*)");
        let i = parseInt(this.id.match(regex)[1]);
        let count = 0,
          checked = 0;
        for (let j = 1; ; j++) {
          const checkbox = $("#" + type + "_" + i + "_" + j);
          if (checkbox.length == 0) {
            break;
          }
          if (
            checkbox.closest("li").prop("hidden") ||
            (checkbox.is(":hidden") &&
              checkbox.prop("id").match(regexFilter) &&
              canFilter(checkbox.closest("li")))
          ) {
            continue;
          }
          count++;
          overallCount++;
          if (checkbox.prop("checked")) {
            checked++;
            overallChecked++;
          }
        }
        if (checked === count) {
          this.innerHTML = $("#" + type + "_nav_totals_" + i)[0].innerHTML =
            "DONE";
          $(this).removeClass("in_progress").addClass("done");
          $($("#" + type + "_nav_totals_" + i)[0])
            .removeClass("in_progress")
            .addClass("done");
        } else {
          this.innerHTML = $("#" + type + "_nav_totals_" + i)[0].innerHTML =
            checked + "/" + count;
          $(this).removeClass("done").addClass("in_progress");
          $($("#" + type + "_nav_totals_" + i)[0])
            .removeClass("done")
            .addClass("in_progress");
        }
      });
      if (overallChecked === overallCount) {
        this.innerHTML = "DONE";
        $(this).removeClass("in_progress").addClass("done");
      } else {
        this.innerHTML = overallChecked + "/" + overallCount;
        $(this).removeClass("done").addClass("in_progress");
      }
    });
  }

  function addCheckbox(el) {
    const $el = $(el);

    let content = $el.clone().find("ul").remove().end().html();
    const sublists = $el.children("ul");

    content = `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="" id="${$el.attr(
          "data-id"
        )}">
        <label class="form-check-label" for="${$el.attr("data-id")}">
          ${content}
        </label>
      </div>`;

    $el.html(content).append(sublists);

    if (
      profiles[profilesKey][profiles.current].checklistData[
        $el.attr("data-id")
      ] === true
    ) {
      $("#" + $el.attr("data-id")).prop("checked", true);
      $el.addClass("completed");
    }
  }

  function canDeleteProfile() {
    let count = 0;
    $.each(profiles[profilesKey], function () {
      count++;
    });
    return count > 1;
  }

  function getFirstProfile() {
    for (let profile in profiles[profilesKey]) {
      return profile;
    }
  }

  function canFilter(entry) {
    if (!entry.attr("class")) {
      return false;
    }
    const classList = entry.attr("class").split(/\s+/);
    let foundMatch = 0;
    for (let i = 0; i < classList.length; i++) {
      if (!classList[i].match(/^f_(.*)/)) {
        continue;
      }
      if (
        classList[i] in
        profiles[profilesKey][profiles.current].hidden_categories
      ) {
        if (
          !profiles[profilesKey][profiles.current].hidden_categories[
            classList[i]
          ]
        ) {
          return false;
        }
        foundMatch = 1;
      }
    }
    if (foundMatch === 0) {
      return false;
    }
    return true;
  }

  function getURLParameterValue(paramName) {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has(paramName)) {
      return urlParams.get(paramName);
    } else {
      return null;
    }
  }
})(jQuery);
