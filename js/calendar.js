/**
 * Calendar generation module for creating ICS files
 */

class CalendarGenerator {
    constructor() {
        this.prodId = 'UBC Workday Calendar Converter';
        this.version = '2.0';
        this.calScale = 'GREGORIAN';
        this.method = 'PUBLISH';
    }

    /**
     * Generate ICS calendar file from courses
     * @param {Array} courses - Array of parsed courses
     * @returns {string} ICS file content
     */
    generateICS(courses) {
        const events = [];
        
        // Generate events for each course
        for (const course of courses) {
            if (course.meetings && course.meetings.length > 0) {
                for (const meeting of course.meetings) {
                    events.push(...this.createRecurringEvents(course, meeting));
                }
            }
        }

        // Build ICS content
        const icsContent = this.buildICSContent(events);
        return icsContent;
    }

    /**
     * Create recurring events for a course meeting pattern
     */
    createRecurringEvents(course, meeting) {
        const events = [];
        
        if (!meeting.days || meeting.days.length === 0) {
            return events;
        }

        // Create recurring event
        const event = {
            uid: this.generateUID(course, meeting),
            summary: `${course.code} - ${course.name}`,
            description: this.buildDescription(course),
            location: meeting.location,
            dtstart: this.getFirstOccurrence(meeting.startDate, meeting.days, meeting.startTime),
            dtend: this.getFirstOccurrence(meeting.startDate, meeting.days, meeting.endTime),
            rrule: this.buildRRule(meeting),
            categories: course.format || 'Lecture',
            status: 'CONFIRMED'
        };

        events.push(event);
        return events;
    }

    /**
     * Build event description
     */
    buildDescription(course) {
        const lines = [];
        
        if (course.name) lines.push(`Course: ${course.code} - ${course.name}`);
        if (course.section) lines.push(`Section: ${course.section}`);
        if (course.instructor) lines.push(`Instructor: ${course.instructor}`);
        if (course.credits) lines.push(`Credits: ${course.credits}`);
        if (course.format) lines.push(`Format: ${course.format}`);
        if (course.delivery) lines.push(`Delivery: ${course.delivery}`);
        if (course.status) lines.push(`Status: ${course.status}`);
        
        return lines.join('\\n');
    }

    /**
     * Get first occurrence of a recurring event
     */
    getFirstOccurrence(startDate, days, time) {
        if (!startDate || !days || days.length === 0 || !time) {
            return null;
        }

        const dayMap = {
            'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0
        };

        // Parse start date
        const [year, month, day] = startDate.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day);
        
        // Find first occurrence
        const startDayOfWeek = baseDate.getDay();
        const targetDays = days.map(d => dayMap[d]).sort((a, b) => a - b);
        
        let daysToAdd = 0;
        for (const targetDay of targetDays) {
            const diff = (targetDay - startDayOfWeek + 7) % 7;
            if (diff === 0 || baseDate.getDay() === targetDay) {
                daysToAdd = 0;
                break;
            }
            if (daysToAdd === 0 || diff < daysToAdd) {
                daysToAdd = diff;
            }
        }

        const firstDate = new Date(baseDate);
        firstDate.setDate(firstDate.getDate() + daysToAdd);
        
        // Format as YYYYMMDDTHHMMSS
        const dateStr = this.formatDate(firstDate);
        const timeStr = time.replace(':', '');
        
        return `${dateStr}T${timeStr}00`;
    }

    /**
     * Build recurrence rule
     */
    buildRRule(meeting) {
        if (!meeting.endDate || !meeting.days || meeting.days.length === 0) {
            return null;
        }

        const until = meeting.endDate.replace(/-/g, '') + 'T235959';
        const byDay = meeting.days.join(',');
        
        return `FREQ=WEEKLY;UNTIL=${until};BYDAY=${byDay}`;
    }

    /**
     * Format date for ICS
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        return `${year}${month}${day}`;
    }

    /**
     * Generate unique ID for event
     */
    generateUID(course, meeting) {
        const timestamp = Date.now();
        const courseId = course.code.replace(/\s+/g, '');
        const meetingId = `${meeting.startDate}-${meeting.days.join('')}`.replace(/[^a-zA-Z0-9]/g, '');
        
        return `${courseId}-${meetingId}-${timestamp}@workday-cal`;
    }

    /**
     * Build complete ICS content
     */
    buildICSContent(events) {
        const lines = [];
        
        // Calendar header
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push(`PRODID:-//${this.prodId}//EN`);
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');
        lines.push('X-WR-CALNAME:UBC Course Schedule');
        lines.push('X-WR-CALDESC:Course schedule imported from UBC Workday');
        lines.push('X-WR-TIMEZONE:America/Vancouver');
        
        // Timezone definition
        lines.push('BEGIN:VTIMEZONE');
        lines.push('TZID:America/Vancouver');
        lines.push('BEGIN:DAYLIGHT');
        lines.push('TZOFFSETFROM:-0800');
        lines.push('TZOFFSETTO:-0700');
        lines.push('TZNAME:PDT');
        lines.push('DTSTART:20250309T020000');
        lines.push('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU');
        lines.push('END:DAYLIGHT');
        lines.push('BEGIN:STANDARD');
        lines.push('TZOFFSETFROM:-0700');
        lines.push('TZOFFSETTO:-0800');
        lines.push('TZNAME:PST');
        lines.push('DTSTART:20251102T020000');
        lines.push('RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU');
        lines.push('END:STANDARD');
        lines.push('END:VTIMEZONE');
        
        // Add events
        for (const event of events) {
            if (!event.dtstart || !event.dtend) continue;
            
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${event.uid}`);
            lines.push(`DTSTAMP:${this.getCurrentTimestamp()}`);
            lines.push(`DTSTART;TZID=America/Vancouver:${event.dtstart}`);
            lines.push(`DTEND;TZID=America/Vancouver:${event.dtend}`);
            
            if (event.rrule) {
                lines.push(`RRULE:${event.rrule}`);
            }
            
            lines.push(`SUMMARY:${this.escapeText(event.summary)}`);
            
            if (event.description) {
                lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
            }
            
            if (event.location) {
                lines.push(`LOCATION:${this.escapeText(event.location)}`);
            }
            
            if (event.categories) {
                lines.push(`CATEGORIES:${event.categories}`);
            }
            
            lines.push(`STATUS:${event.status || 'CONFIRMED'}`);
            lines.push('END:VEVENT');
        }
        
        // Calendar footer
        lines.push('END:VCALENDAR');
        
        // Join with CRLF as per ICS specification
        return lines.join('\r\n');
    }

    /**
     * Get current timestamp in ICS format
     */
    getCurrentTimestamp() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = now.getUTCDate().toString().padStart(2, '0');
        const hours = now.getUTCHours().toString().padStart(2, '0');
        const minutes = now.getUTCMinutes().toString().padStart(2, '0');
        const seconds = now.getUTCSeconds().toString().padStart(2, '0');
        
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    /**
     * Escape text for ICS format
     */
    escapeText(text) {
        if (!text) return '';
        
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    }

    /**
     * Download ICS file
     */
    downloadICS(content, filename = 'ubc-schedule.ics') {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarGenerator;
}