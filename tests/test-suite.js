/**
 * Test suite for UBC Workday Calendar Converter
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.resultsContainer = document.getElementById('test-results');
        this.summaryContainer = document.getElementById('test-summary');
    }

    describe(suiteName, testFn) {
        const suite = {
            name: suiteName,
            tests: []
        };
        
        const context = {
            it: (testName, fn) => {
                suite.tests.push({ name: testName, fn });
            }
        };
        
        testFn.call(context);
        this.tests.push(suite);
    }

    async run() {
        this.resultsContainer.innerHTML = '';
        this.passed = 0;
        this.failed = 0;

        for (const suite of this.tests) {
            const suiteDiv = document.createElement('div');
            suiteDiv.className = 'test-suite';
            
            const suiteTitle = document.createElement('h2');
            suiteTitle.textContent = suite.name;
            suiteDiv.appendChild(suiteTitle);

            for (const test of suite.tests) {
                const result = await this.runTest(test);
                const resultDiv = this.createResultElement(test.name, result);
                suiteDiv.appendChild(resultDiv);
            }

            this.resultsContainer.appendChild(suiteDiv);
        }

        this.updateSummary();
    }

    async runTest(test) {
        try {
            await test.fn();
            this.passed++;
            return { success: true };
        } catch (error) {
            this.failed++;
            return { success: false, error: error.message || error };
        }
    }

    createResultElement(testName, result) {
        const div = document.createElement('div');
        div.className = `test-result ${result.success ? 'pass' : 'fail'}`;
        
        const status = result.success ? '✓' : '✗';
        div.innerHTML = `<strong>${status}</strong> ${testName}`;
        
        if (!result.success && result.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-details';
            errorDiv.textContent = result.error;
            div.appendChild(errorDiv);
        }
        
        return div;
    }

    updateSummary() {
        const total = this.passed + this.failed;
        const percentage = total > 0 ? Math.round((this.passed / total) * 100) : 0;
        
        this.summaryContainer.innerHTML = `
            <strong>Test Results:</strong> 
            ${this.passed} passed, ${this.failed} failed out of ${total} tests
            (${percentage}% passing)
        `;
        
        this.summaryContainer.style.background = this.failed === 0 ? '#d4edda' : '#f8d7da';
    }
}

// Helper assertion functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, but got ${actual}`);
    }
}

function assertContains(str, substring, message) {
    if (!str.includes(substring)) {
        throw new Error(message || `Expected "${str}" to contain "${substring}"`);
    }
}

// Initialize test runner
const runner = new TestRunner();

// Test WorkdayParser
runner.describe('WorkdayParser', function() {
    const parser = new WorkdayParser();

    this.it('should parse student info correctly', () => {
        const info = parser.parseStudentInfo('Test Student (12345678) - Fall 2025');
        assert(info !== null, 'Student info should not be null');
        assertEquals(info.name, 'Test Student');
        assertEquals(info.id, '12345678');
        assertEquals(info.term, 'Fall 2025');
    });

    this.it('should parse days correctly', () => {
        const days = parser.parseDays('Mon Wed Fri');
        assert(Array.isArray(days), 'Days should be an array');
        assertEquals(days.length, 3);
        assert(days.includes('MO'), 'Should include Monday');
        assert(days.includes('WE'), 'Should include Wednesday');
        assert(days.includes('FR'), 'Should include Friday');
    });

    this.it('should convert 12-hour to 24-hour time', () => {
        assertEquals(parser.convertTo24Hour('9:30', 'a.m.'), '09:30');
        assertEquals(parser.convertTo24Hour('2:45', 'p.m.'), '14:45');
        assertEquals(parser.convertTo24Hour('12:00', 'p.m.'), '12:00');
        assertEquals(parser.convertTo24Hour('12:30', 'a.m.'), '00:30');
    });

    this.it('should parse meeting patterns', () => {
        const pattern = '2025-09-02 - 2025-12-04 | Tue Thu | 3:30 p.m. - 5:00 p.m. | UBCV | Building | Floor: 1 | Room: 101';
        const meetings = parser.parseMeetingPatterns(pattern);
        
        assert(meetings.length > 0, 'Should parse at least one meeting');
        const meeting = meetings[0];
        
        assertEquals(meeting.startDate, '2025-09-02');
        assertEquals(meeting.endDate, '2025-12-04');
        assert(meeting.days.includes('TU'), 'Should include Tuesday');
        assert(meeting.days.includes('TH'), 'Should include Thursday');
        assertEquals(meeting.startTime, '15:30');
        assertEquals(meeting.endTime, '17:00');
        assertContains(meeting.location, 'UBCV');
    });

    this.it('should parse course row correctly', () => {
        const headers = ['Course Listing', 'Drop', 'Swap', 'Credits', 'Grading Basis', 
                        'Section', 'Registration Status', 'Instructional Format', 
                        'Delivery Mode', 'Meeting Patterns', 'Instructor', 'Start Date', 'End Date'];
        
        const row = [
            null,
            'COMP_V 101 - Introduction to Computing',
            null,
            '3',
            'Graded',
            'COMP_V 101-001',
            'Registered',
            'Lecture',
            'In Person Learning',
            '2025-09-02 - 2025-12-04 | Mon Wed Fri | 9:00 a.m. - 10:00 a.m. | UBCV | Building | Floor: 1 | Room: 101',
            'Dr. Jane Smith',
            '2025-09-02',
            '2025-12-04'
        ];
        
        const course = parser.parseCourseRow(row, headers, null);
        
        assertEquals(course.code, 'COMP 101');
        assertEquals(course.name, 'Introduction to Computing');
        assertEquals(course.credits, '3');
        assertEquals(course.instructor, 'Dr. Jane Smith');
        assert(course.meetings.length > 0, 'Should have meetings');
    });
});

// Test CalendarGenerator
runner.describe('CalendarGenerator', function() {
    const calendar = new CalendarGenerator();

    this.it('should generate valid UID', () => {
        const course = { code: 'COMP 101' };
        const meeting = { 
            startDate: '2025-09-02', 
            days: ['MO', 'WE', 'FR'] 
        };
        
        const uid = calendar.generateUID(course, meeting);
        assert(uid.length > 0, 'UID should not be empty');
        assertContains(uid, 'COMP101');
        assertContains(uid, '@workday-cal');
    });

    this.it('should escape text properly', () => {
        const escaped = calendar.escapeText('Test; with, special\\n characters');
        assertContains(escaped, '\\;');
        assertContains(escaped, '\\,');
        assertContains(escaped, '\\n');
    });

    this.it('should format date correctly', () => {
        const date = new Date(2025, 8, 2); // September 2, 2025
        const formatted = calendar.formatDate(date);
        assertEquals(formatted, '20250902');
    });

    this.it('should build valid recurrence rule', () => {
        const meeting = {
            endDate: '2025-12-04',
            days: ['MO', 'WE', 'FR']
        };
        
        const rrule = calendar.buildRRule(meeting);
        assertContains(rrule, 'FREQ=WEEKLY');
        assertContains(rrule, 'UNTIL=20251204T235959');
        assertContains(rrule, 'BYDAY=MO,WE,FR');
    });

    this.it('should get first occurrence correctly', () => {
        const firstOcc = calendar.getFirstOccurrence('2025-09-02', ['TU', 'TH'], '14:00');
        assert(firstOcc !== null, 'First occurrence should not be null');
        // September 2, 2025 is a Tuesday
        assertEquals(firstOcc, '20250902T140000');
    });

    this.it('should generate valid ICS content', () => {
        const courses = [{
            code: 'TEST 101',
            name: 'Test Course',
            instructor: 'Test Instructor',
            credits: '3',
            meetings: [{
                startDate: '2025-09-02',
                endDate: '2025-12-04',
                days: ['MO', 'WE'],
                startTime: '09:00',
                endTime: '10:00',
                location: 'Test Location'
            }]
        }];
        
        const ics = calendar.generateICS(courses);
        
        assertContains(ics, 'BEGIN:VCALENDAR');
        assertContains(ics, 'END:VCALENDAR');
        assertContains(ics, 'VERSION:2.0');
        assertContains(ics, 'BEGIN:VEVENT');
        assertContains(ics, 'END:VEVENT');
        assertContains(ics, 'TEST 101');
        assertContains(ics, 'Test Course');
        assertContains(ics, 'RRULE:');
    });
});

// Test date handling edge cases
runner.describe('Date Handling', function() {
    const parser = new WorkdayParser();
    const calendar = new CalendarGenerator();

    this.it('should handle different date formats', () => {
        const date1 = parser.parseDate('2025-09-02');
        assertEquals(date1, '2025-09-02');
        
        const date2 = parser.parseDate('2025-09-02 00:00:00');
        assertEquals(date2, '2025-09-02');
        
        const date3 = parser.parseDate(new Date(2025, 8, 2));
        assertEquals(date3, '2025-09-02');
    });

    this.it('should handle reading break in meeting patterns', () => {
        const pattern = `2026-01-05 - 2026-02-11 | Mon Wed | 12:30 p.m. - 2:00 p.m. | UBCV | Building | Floor: 3 | Room: 301

2026-02-23 - 2026-04-08 | Mon Wed | 12:30 p.m. - 2:00 p.m. | UBCV | Building | Floor: 3 | Room: 301`;
        
        const meetings = parser.parseMeetingPatterns(pattern);
        assertEquals(meetings.length, 2, 'Should parse two separate meeting periods');
        assertEquals(meetings[0].endDate, '2026-02-11');
        assertEquals(meetings[1].startDate, '2026-02-23');
    });

    this.it('should handle timezone correctly in ICS', () => {
        const courses = [{
            code: 'TEST 101',
            name: 'Test Course',
            meetings: [{
                startDate: '2025-09-02',
                endDate: '2025-09-03',
                days: ['TU'],
                startTime: '14:00',
                endTime: '15:00',
                location: 'Test'
            }]
        }];
        
        const ics = calendar.generateICS(courses);
        assertContains(ics, 'TZID:America/Vancouver');
        assertContains(ics, 'BEGIN:VTIMEZONE');
        assertContains(ics, 'END:VTIMEZONE');
    });
});

// Run all tests when page loads
document.addEventListener('DOMContentLoaded', () => {
    runner.run();
});