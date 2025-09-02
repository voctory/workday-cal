/**
 * Calendar View Module for displaying courses in a weekly grid
 */

class CalendarView {
    constructor() {
        this.container = document.getElementById('calendar-container');
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        this.dayMap = {
            'MO': 0, 'TU': 1, 'WE': 2, 'TH': 3, 'FR': 4
        };
        this.timeSlots = this.generateTimeSlots();
        this.colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#5CB85C', '#F39C12',
            '#9B59B6', '#3498DB', '#E74C3C', '#1ABC9C', '#34495E',
            '#E67E22', '#16A085', '#8E44AD', '#2980B9', '#27AE60'
        ];
        this.courseColors = new Map();
    }

    generateTimeSlots() {
        const slots = [];
        for (let hour = 8; hour <= 20; hour++) {
            slots.push(`${hour}:00`);
            slots.push(`${hour}:30`);
        }
        return slots;
    }

    render(courses) {
        this.container.innerHTML = '';
        this.courseColors.clear();
        
        // Assign colors to courses
        courses.forEach((course, index) => {
            this.courseColors.set(course.code, this.colors[index % this.colors.length]);
        });

        // Group courses by term
        const coursesByTerm = this.groupCoursesByTerm(courses);
        
        // Create calendar for each term
        for (const [term, termCourses] of Object.entries(coursesByTerm)) {
            if (termCourses.length > 0) {
                this.createTermCalendar(term, termCourses);
            }
        }
    }

    groupCoursesByTerm(courses) {
        const grouped = {};
        
        courses.forEach(course => {
            const term = this.determineTerm(course);
            
            // Handle Winter Full Year courses - add to both Term 1 and Term 2
            if (term === 'Winter Full Year') {
                // Add to Winter Term 1
                if (!grouped['Winter Term 1']) {
                    grouped['Winter Term 1'] = [];
                }
                grouped['Winter Term 1'].push({
                    ...course,
                    isFullYear: true,
                    displayTerm: 'Winter Term 1 (Full Year)'
                });
                
                // Add to Winter Term 2
                if (!grouped['Winter Term 2']) {
                    grouped['Winter Term 2'] = [];
                }
                grouped['Winter Term 2'].push({
                    ...course,
                    isFullYear: true,
                    displayTerm: 'Winter Term 2 (Full Year)'
                });
            } else {
                // Regular course - add to its term
                if (!grouped[term]) {
                    grouped[term] = [];
                }
                grouped[term].push(course);
            }
        });
        
        // Remove the standalone "Winter Full Year" group if it exists
        delete grouped['Winter Full Year'];
        
        return grouped;
    }

    determineTerm(course) {
        // Reuse the logic from app.js
        if (course.student && course.student.term) {
            const termInfo = course.student.term.toLowerCase();
            if (termInfo.includes('winter') && termInfo.includes('term 1')) return 'Winter Term 1';
            if (termInfo.includes('winter') && termInfo.includes('term 2')) return 'Winter Term 2';
            if (termInfo.includes('summer') && termInfo.includes('term 1')) return 'Summer Term 1';
            if (termInfo.includes('summer') && termInfo.includes('term 2')) return 'Summer Term 2';
        }
        
        if (course.startDate && course.endDate) {
            const startMonth = parseInt(course.startDate.split('-')[1]);
            const endMonth = parseInt(course.endDate.split('-')[1]);
            
            if (startMonth >= 9 && endMonth >= 3 && endMonth <= 4) return 'Winter Full Year';
            if (startMonth >= 9 && endMonth <= 12) return 'Winter Term 1';
            if (startMonth >= 1 && startMonth <= 4 && endMonth <= 4) return 'Winter Term 2';
            if (startMonth >= 5 && startMonth <= 6 && endMonth <= 6) return 'Summer Term 1';
            if (startMonth >= 7 && startMonth <= 8) return 'Summer Term 2';
            if (startMonth >= 5 && endMonth >= 7) return 'Summer Full Term';
        }
        
        // Check meetings
        if (course.meetings && course.meetings.length > 0) {
            const firstMeeting = course.meetings[0];
            if (firstMeeting.startDate) {
                const startMonth = parseInt(firstMeeting.startDate.split('-')[1]);
                if (startMonth >= 9) return 'Winter Term 1';
                if (startMonth <= 4) return 'Winter Term 2';
                if (startMonth >= 5 && startMonth <= 6) return 'Summer Term 1';
                if (startMonth >= 7 && startMonth <= 8) return 'Summer Term 2';
            }
        }
        
        return 'Other';
    }

    createTermCalendar(termName, courses) {
        const termContainer = document.createElement('div');
        termContainer.className = 'term-calendar';
        
        // Term header
        const termHeader = document.createElement('div');
        termHeader.className = 'term-calendar-header';
        termHeader.innerHTML = `<h3>${this.getTermEmoji(termName)} ${termName}</h3>`;
        termContainer.appendChild(termHeader);
        
        // Create calendar grid
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';
        
        // Add time column
        const timeColumn = document.createElement('div');
        timeColumn.className = 'time-column';
        
        // Empty cell for alignment
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-header-cell';
        timeColumn.appendChild(emptyCell);
        
        // Add time slots
        this.timeSlots.forEach(time => {
            const timeCell = document.createElement('div');
            timeCell.className = 'time-cell';
            timeCell.textContent = time;
            timeColumn.appendChild(timeCell);
        });
        
        calendarGrid.appendChild(timeColumn);
        
        // Add day columns
        this.days.forEach((day, dayIndex) => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            
            // Day header
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header-cell';
            dayHeader.textContent = day;
            dayColumn.appendChild(dayHeader);
            
            // Create slots for this day
            const daySlots = document.createElement('div');
            daySlots.className = 'day-slots';
            daySlots.style.position = 'relative';
            daySlots.style.height = `${this.timeSlots.length * 30}px`;
            
            // Add grid lines
            this.timeSlots.forEach((time, index) => {
                const gridLine = document.createElement('div');
                gridLine.className = 'grid-line';
                gridLine.style.top = `${index * 30}px`;
                daySlots.appendChild(gridLine);
            });
            
            // Add courses for this day
            courses.forEach(course => {
                if (course.meetings) {
                    course.meetings.forEach(meeting => {
                        if (meeting.days && meeting.days.includes(this.getDayCode(dayIndex))) {
                            const courseBlock = this.createCourseBlock(course, meeting);
                            if (courseBlock) {
                                daySlots.appendChild(courseBlock);
                            }
                        }
                    });
                }
            });
            
            dayColumn.appendChild(daySlots);
            calendarGrid.appendChild(dayColumn);
        });
        
        termContainer.appendChild(calendarGrid);
        
        // Add legend
        const legend = this.createLegend(courses);
        termContainer.appendChild(legend);
        
        // Add attribution watermark
        const attribution = document.createElement('div');
        attribution.className = 'calendar-attribution';
        attribution.innerHTML = `
            <span class="attribution-text">voctory.github.io/workday-cal</span>
        `;
        termContainer.appendChild(attribution);
        
        this.container.appendChild(termContainer);
    }

    getDayCode(dayIndex) {
        const codes = ['MO', 'TU', 'WE', 'TH', 'FR'];
        return codes[dayIndex];
    }

    createCourseBlock(course, meeting) {
        if (!meeting.startTime || !meeting.endTime) return null;
        
        const startMinutes = this.timeToMinutes(meeting.startTime);
        const endMinutes = this.timeToMinutes(meeting.endTime);
        
        // Calculate position and height
        const baseTime = 8 * 60; // 8:00 AM in minutes
        const top = ((startMinutes - baseTime) / 30) * 30; // 30px per half hour
        const height = ((endMinutes - startMinutes) / 30) * 30;
        
        if (top < 0 || height <= 0) return null;
        
        const block = document.createElement('div');
        block.className = 'course-block';
        block.style.position = 'absolute';
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.backgroundColor = this.courseColors.get(course.code);
        block.style.left = '2px';
        block.style.right = '2px';
        
        // Add course info
        const courseInfo = document.createElement('div');
        courseInfo.className = 'course-block-info';
        courseInfo.innerHTML = `
            <div class="course-block-code">${course.code}</div>
            <div class="course-block-time">${meeting.startTime} - ${meeting.endTime}</div>
            ${meeting.location ? `<div class="course-block-location">${meeting.location}</div>` : ''}
        `;
        block.appendChild(courseInfo);
        
        // Add tooltip
        block.title = `${course.code} - ${course.name}\n${meeting.startTime} - ${meeting.endTime}\n${meeting.location || 'No location'}`;
        
        return block;
    }

    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getTermEmoji(termName) {
        const emojis = {
            'Winter Full Year': '🎓',
            'Winter Term 1': '🍂',
            'Winter Term 2': '❄️',
            'Summer Term 1': '☀️',
            'Summer Term 2': '🌻',
            'Summer Full Term': '🌞',
            'Other': '📚'
        };
        return emojis[termName] || '📅';
    }

    createLegend(courses) {
        const legend = document.createElement('div');
        legend.className = 'calendar-legend';
        
        const legendTitle = document.createElement('h4');
        legendTitle.textContent = 'Courses';
        legend.appendChild(legendTitle);
        
        const legendItems = document.createElement('div');
        legendItems.className = 'legend-items';
        
        courses.forEach(course => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = this.courseColors.get(course.code);
            
            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = `${course.code} - ${course.name}${course.isFullYear ? ' (Full Year)' : ''}`;
            
            item.appendChild(colorBox);
            item.appendChild(label);
            legendItems.appendChild(item);
        });
        
        legend.appendChild(legendItems);
        return legend;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarView;
}