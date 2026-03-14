import assert from "node:assert/strict";

import {
  SIMPLE_CALENDAR_MODULE_IDS,
  addCalendarDays,
  formatCalendarDateTimeLabel,
  getCalendarDayKey,
  getCalendarSecondsPerDay,
  getElapsedCalendarDays,
  isSimpleCalendarActive
} from "./core/calendar-bridge.js";

{
  assert.ok(SIMPLE_CALENDAR_MODULE_IDS.includes("foundryvtt-simple-calendar"));
  assert.ok(SIMPLE_CALENDAR_MODULE_IDS.includes("foundryvtt-simple-calendar-compat"));
}

{
  const gameRef = {
    modules: new Map()
  };
  const globalRef = {
    SimpleCalendar: {
      api: {
        timestampToDate() {
          return {};
        }
      }
    }
  };

  assert.equal(isSimpleCalendarActive({ gameRef, globalRef }), true);
}

{
  const api = {
    getTimeConfiguration() {
      return {
        hoursInDay: 10,
        minutesInHour: 100,
        secondsInMinute: 100
      };
    }
  };

  assert.equal(getCalendarSecondsPerDay({ api }), 100000);
}

{
  assert.equal(getElapsedCalendarDays(86300, 86500), 1);
  assert.equal(getElapsedCalendarDays(100, 86000), 0);
}

{
  const api = {
    timestampPlusInterval(timestamp, interval) {
      assert.deepEqual(interval, { day: 3 });
      return timestamp + 777;
    }
  };

  assert.equal(addCalendarDays(1000, 3, { api }), 1777);
}

{
  const api = {
    timestampToDate() {
      return {
        year: 1491,
        month: 0,
        day: 0,
        hour: 8,
        minute: 5,
        monthName: "Hammer"
      };
    }
  };

  assert.equal(formatCalendarDateTimeLabel(0, { api }), "Y1491 Hammer 1 08:05");
}

{
  const api = {
    timestampToDate() {
      return {
        year: 3,
        month: 11,
        day: 27
      };
    }
  };

  assert.equal(getCalendarDayKey(123, { api }), "Y3-M11-D27");
}
