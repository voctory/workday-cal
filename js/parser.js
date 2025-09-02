/**
 * Parser module for UBC Workday Excel schedule files
 */

class WorkdayParser {
    constructor() {
        this.headerRow = 6; // Headers are at row 6 (0-indexed: 5)
        this.dataStartRow = 7; // Data starts at row 7 (0-indexed: 6)
    }

    /**
     * Parse Excel file and extract course data
     * @param {ArrayBuffer} data - Excel file data
     * @returns {Array} Array of parsed courses
     */
    parseExcel(data) {
        try {
            const workbook = XLSX.read(data, { 
                type: 'array', 
                cellDates: true,
                cellFormula: false,  // Don't evaluate formulas
                cellText: true,      // Get display text
                cellNF: false,       // Don't apply number formats
                sheetStubs: true     // Include empty cells
            });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Fix the range if it's incorrectly set (common with merged cells)
            if (!worksheet['!ref'] || worksheet['!ref'] === 'A1') {
                // Scan to find the actual range
                let maxRow = 0, maxCol = 0;
                for (const cell in worksheet) {
                    if (cell[0] === '!') continue;
                    const decoded = XLSX.utils.decode_cell(cell);
                    maxRow = Math.max(maxRow, decoded.r);
                    maxCol = Math.max(maxCol, decoded.c);
                }
                if (maxRow > 0 || maxCol > 0) {
                    worksheet['!ref'] = XLSX.utils.encode_range({
                        s: {r: 0, c: 0},
                        e: {r: maxRow, c: maxCol}
                    });
                }
            }
            
            
            // Convert to JSON - prefer text values (w) over raw values (v)
            const jsonData = [];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const row = [];
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = XLSX.utils.encode_cell({r: R, c: C});
                    const cell = worksheet[cell_address];
                    if (cell) {
                        // Prefer display text (w) over value (v)
                        row.push(cell.w || cell.v || '');
                    } else {
                        row.push(null);
                    }
                }
                jsonData.push(row);
            }


            if (jsonData.length < this.dataStartRow) {
                throw new Error('Invalid file format: insufficient data rows');
            }

            // Extract headers
            const headers = jsonData[this.headerRow - 1]; // Convert to 0-indexed
            
            if (!this.validateHeaders(headers)) {
                throw new Error('Invalid file format: expected UBC Workday course schedule format');
            }

            // Extract courses
            const courses = [];
            let currentStudent = null;
            let courseRowsFound = 0;

            for (let i = this.dataStartRow - 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                // Check if first column contains student info AND course info together
                // This happens in the actual Workday export format
                if (row[0] && typeof row[0] === 'string' && row[0].includes('(') && row[0].includes(')')) {
                    // Extract student info from the complex first column
                    const studentMatch = row[0].match(/([^(]+)\((\d+)\)/);
                    if (studentMatch) {
                        currentStudent = {
                            name: studentMatch[1].trim(),
                            id: studentMatch[2],
                            term: 'Current Term'
                        };
                    }
                }

                
                // Parse course if we have valid data in Drop column (index 1)
                if (row[1]) {
                    // Check if it looks like course data
                    const cellValue = String(row[1]);
                    if (cellValue.includes('_V ')) {
                        courseRowsFound++;
                        const course = this.parseCourseRow(row, headers, currentStudent);
                        if (course && course.code) {
                            courses.push(course);
                            }
                    }
                }
            }

            return courses;
        } catch (error) {
            console.error('Error parsing Excel:', error);
            throw new Error(`Failed to parse file: ${error.message}`);
        }
    }

    /**
     * Validate that headers match expected format
     */
    validateHeaders(headers) {
        if (!headers || headers.length < 5) return false;
        
        // The key headers we absolutely need to identify this as a Workday schedule
        const criticalHeaders = ['Drop', 'Credits', 'Grading'];
        
        // Convert headers to string and check
        const headerString = headers.filter(h => h).join(' ').toLowerCase();
        
        // Check if we have the critical headers that identify a Workday schedule
        const hasCriticalHeaders = criticalHeaders.every(header => 
            headerString.includes(header.toLowerCase())
        );
        
        if (!hasCriticalHeaders) {
            return false;
        }
        
        return true;
    }

    /**
     * Parse student info from header row
     */
    parseStudentInfo(text) {
        const match = text.match(/(.+?)\s*\((\d+)\)\s*-\s*(.+)/);
        if (match) {
            return {
                name: match[1].trim(),
                id: match[2],
                term: match[3].trim()
            };
        }
        return null;
    }

    /**
     * Parse a course row
     */
    parseCourseRow(row, headers, studentInfo) {
        const course = {
            student: studentInfo,
            code: '',
            name: '',
            section: '',
            credits: '',
            instructor: '',
            format: '',
            delivery: '',
            status: '',
            meetings: []
        };

        // Map columns by header index - headers might have empty cells at the beginning
        const columnMap = {};
        headers.forEach((header, index) => {
            if (header && header.trim()) {
                columnMap[header.trim()] = index;
            }
        });

        // Handle the case where student info is in first column
        // and actual course data starts from "Drop" column
        if (row[0] && row[0].includes(' - ') && row[0].includes('(')) {
            // Parse student info from first column if not already set
            if (!studentInfo) {
                studentInfo = this.parseStudentInfo(row[0]);
                course.student = studentInfo;
            }
        }

        // Extract course code and name from Drop column
        // IMPORTANT: In the CSV, headers start at column B (index 1) but "Drop" header might map to index 2
        // However, the actual course data is ALWAYS at index 1 in the data rows
        // This is because column A contains merged student info spanning multiple rows
        const courseListing = row[1];  // Always use index 1 for course data
        
        if (courseListing) {
            // Ensure it's a string
            const courseStr = String(courseListing).trim();
            
            // Match patterns like "CPSC_V 430" or "APSC_V 486"
            // Make the regex more flexible for potential whitespace/encoding issues
            const courseMatch = courseStr.match(/([A-Z]+)_V\s+(\d+)\s*[-–—]\s*(.+)/);
            if (courseMatch) {
                course.code = `${courseMatch[1]} ${courseMatch[2]}`;  // "CPSC 430"
                course.name = courseMatch[3].trim();
            } else {
            }
        }

        // The actual data appears to be shifted - adjust indices
        // Credits is in column 4 (index 3) but shows as "3" in column 5 (index 4)
        course.credits = row[4] || row[columnMap['Credits']] || '';
        course.section = row[6] || row[columnMap['Section']] || '';
        course.status = row[7] || row[columnMap['Registration Status']] || '';
        course.format = row[8] || row[columnMap['Instructional Format']] || '';
        course.delivery = row[9] || row[columnMap['Delivery Mode']] || '';
        
        // Meeting patterns is in column 10 (index 9)
        const meetingPattern = row[10] || row[columnMap['Meeting Patterns']] || '';
        if (meetingPattern) {
            course.meetings = this.parseMeetingPatterns(meetingPattern);
        }
        
        // Instructor is in column 11 (index 10)
        course.instructor = row[11] || row[columnMap['Instructor']] || '';

        // Dates are in columns 12 and 13 (indices 11 and 12)
        const startDate = row[12] || row[columnMap['Start Date']];
        const endDate = row[13] || row[columnMap['End Date']];
        
        if (startDate) course.startDate = this.parseDate(startDate);
        if (endDate) course.endDate = this.parseDate(endDate);

        return course;
    }

    /**
     * Parse meeting patterns string into structured data
     */
    parseMeetingPatterns(pattern) {
        if (!pattern || typeof pattern !== 'string') return [];
        
        const meetings = [];
        const lines = pattern.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            // Pattern: "2025-09-02 - 2025-12-04 | Tue Thu | 3:30 p.m. - 5:00 p.m. | UBCV | Building | Floor: X | Room: Y"
            const parts = line.split('|').map(p => p.trim());
            
            if (parts.length >= 3) {
                const dateRange = parts[0];
                const days = parts[1];
                const timeRange = parts[2];
                const location = parts.slice(3).join(' | ');
                
                // Parse date range
                const dateMatch = dateRange.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
                
                // Parse time range
                const timeMatch = timeRange.match(/(\d{1,2}:\d{2})\s*(a\.m\.|p\.m\.)\s*-\s*(\d{1,2}:\d{2})\s*(a\.m\.|p\.m\.)/);
                
                if (dateMatch && timeMatch) {
                    meetings.push({
                        startDate: dateMatch[1],
                        endDate: dateMatch[2],
                        days: this.parseDays(days),
                        startTime: this.convertTo24Hour(timeMatch[1], timeMatch[2]),
                        endTime: this.convertTo24Hour(timeMatch[3], timeMatch[4]),
                        location: this.parseLocation(location)
                    });
                }
            }
        }
        
        return meetings;
    }

    /**
     * Parse days string into array
     */
    parseDays(daysStr) {
        if (!daysStr) return [];
        
        const dayMap = {
            'Mon': 'MO',
            'Tue': 'TU',
            'Wed': 'WE',
            'Thu': 'TH',
            'Fri': 'FR',
            'Sat': 'SA',
            'Sun': 'SU'
        };
        
        const days = [];
        for (const [full, abbr] of Object.entries(dayMap)) {
            if (daysStr.includes(full)) {
                days.push(abbr);
            }
        }
        
        return days;
    }

    /**
     * Convert 12-hour time to 24-hour format
     */
    convertTo24Hour(time, period) {
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        
        if (period.includes('p.m.') && hours !== 12) {
            hour24 += 12;
        } else if (period.includes('a.m.') && hours === 12) {
            hour24 = 0;
        }
        
        return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Parse location string
     */
    parseLocation(locationStr) {
        if (!locationStr) return '';
        
        // Clean up location string
        return locationStr
            .replace(/Floor:\s*/g, 'Floor ')
            .replace(/Room:\s*/g, 'Room ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Parse date string
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle various date formats
        if (dateStr instanceof Date) {
            return dateStr.toISOString().split('T')[0];
        }
        
        // If it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr.split(' ')[0];
        }
        
        // Try to parse other formats
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn('Could not parse date:', dateStr);
        }
        
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkdayParser;
}