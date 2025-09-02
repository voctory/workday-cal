/**
 * Main application logic
 */

class WorkdayCalendarApp {
    constructor() {
        this.parser = new WorkdayParser();
        this.calendar = new CalendarGenerator();
        this.courses = [];
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('file-input');
        this.uploadSection = document.getElementById('upload-section');
        this.previewSection = document.getElementById('preview-section');
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.courseList = document.getElementById('course-list');
        this.downloadBtn = document.getElementById('download-ics');
        this.resetBtn = document.getElementById('reset');
    }

    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Drag and drop events
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.remove('dragover');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropzone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Download button
        this.downloadBtn.addEventListener('click', () => {
            this.downloadCalendar();
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => {
            this.reset();
        });

        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
        });
    }

    handleFile(file) {
        // Validate file type
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            this.showError('Please upload an Excel file (.xlsx or .xls)');
            return;
        }

        // Clear any previous errors
        this.hideError();

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                this.courses = this.parser.parseExcel(data);
                
                if (this.courses.length === 0) {
                    this.showError('No courses found in the uploaded file. Please ensure you\'re uploading a UBC Workday course schedule.');
                    return;
                }

                this.displayCourses();
                this.showPreview();
            } catch (error) {
                console.error('Error processing file:', error);
                this.showError(`Error processing file: ${error.message}`);
            }
        };

        reader.onerror = () => {
            this.showError('Error reading file. Please try again.');
        };

        reader.readAsArrayBuffer(file);
    }

    displayCourses() {
        this.courseList.innerHTML = '';
        
        // Group courses by code for better display
        const courseMap = new Map();
        
        for (const course of this.courses) {
            if (!courseMap.has(course.code)) {
                courseMap.set(course.code, course);
            }
        }

        // Display each unique course
        for (const [code, course] of courseMap) {
            const courseElement = this.createCourseElement(course);
            this.courseList.appendChild(courseElement);
        }
    }

    createCourseElement(course) {
        const div = document.createElement('div');
        div.className = 'course-item';
        
        const title = document.createElement('div');
        title.className = 'course-title';
        title.textContent = `${course.code} - ${course.name}`;
        div.appendChild(title);

        const details = document.createElement('div');
        details.className = 'course-details';
        
        const detailItems = [];
        if (course.section) detailItems.push(`<span>📚 ${course.section}</span>`);
        if (course.credits) detailItems.push(`<span>🎓 ${course.credits} credits</span>`);
        if (course.instructor) detailItems.push(`<span>👨‍🏫 ${course.instructor}</span>`);
        if (course.format) detailItems.push(`<span>📖 ${course.format}</span>`);
        
        details.innerHTML = detailItems.join('');
        div.appendChild(details);

        // Add meeting times
        if (course.meetings && course.meetings.length > 0) {
            const schedule = document.createElement('div');
            schedule.className = 'course-schedule';
            
            for (const meeting of course.meetings) {
                const scheduleItem = document.createElement('div');
                scheduleItem.className = 'schedule-item';
                
                const days = meeting.days.map(d => {
                    const dayNames = { 'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu', 'FR': 'Fri', 'SA': 'Sat', 'SU': 'Sun' };
                    return dayNames[d] || d;
                }).join(', ');
                
                const timeStr = `${this.formatTime(meeting.startTime)} - ${this.formatTime(meeting.endTime)}`;
                const dateStr = `${this.formatDateRange(meeting.startDate, meeting.endDate)}`;
                
                scheduleItem.innerHTML = `
                    <strong>📅 ${days}</strong> ${timeStr}<br>
                    <small>${dateStr}</small><br>
                    ${meeting.location ? `<small>📍 ${meeting.location}</small>` : ''}
                `;
                
                schedule.appendChild(scheduleItem);
            }
            
            div.appendChild(schedule);
        }

        return div;
    }

    formatTime(time24) {
        if (!time24) return '';
        
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    formatDateRange(startDate, endDate) {
        if (!startDate || !endDate) return '';
        
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }

    showPreview() {
        this.uploadSection.style.display = 'none';
        this.previewSection.style.display = 'block';
    }

    hidePreview() {
        this.uploadSection.style.display = 'block';
        this.previewSection.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
    }

    hideError() {
        this.errorSection.style.display = 'none';
        this.errorMessage.textContent = '';
    }

    downloadCalendar() {
        try {
            const icsContent = this.calendar.generateICS(this.courses);
            
            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const filename = `ubc-schedule-${dateStr}.ics`;
            
            this.calendar.downloadICS(icsContent, filename);
        } catch (error) {
            console.error('Error generating calendar:', error);
            this.showError(`Error generating calendar: ${error.message}`);
        }
    }

    reset() {
        this.courses = [];
        this.fileInput.value = '';
        this.hidePreview();
        this.hideError();
        this.courseList.innerHTML = '';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WorkdayCalendarApp();
});