/* Menu Options */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Options')
      .addItem("Import Last 5 Courses", 'importCourses')
      .addItem('Check Attendance on Current Sheet', 'checkAll')
      .addToUi();
}

/*
  Description: Option for teachers to import their
  most 5 recently created courses
*/
function importCourses() {
  var optionalArgs = {
    teacherId: 'me',
    courseStates: 'ACTIVE'
  };
  var response = Classroom.Courses.list(optionalArgs);
  var courses = response.courses
  for (var i = 0; i < courses.length; i++) {
    var courseName = courses[i].name
    var courseId = courses[i].id
    insertCourse(courseName, courseId)
  }
}

/*
  Description: Create the Sheet for Course
  @param {String} courseName - Name of Course
  @param {String} courseId - Corresponding Classroom ID
*/
function insertCourse(courseName, courseId) {
    var spreadsheetName = courseName + "(" + courseId + ")"
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var yourNewSheet = activeSpreadsheet.getSheetByName(spreadsheetName);

    if (yourNewSheet != null) {
        return
    }
    yourNewSheet = activeSpreadsheet.insertSheet();
    yourNewSheet.setName(spreadsheetName);
    yourNewSheet.appendRow(['Student Name', 'Email Address', 'Replace with Meet Code'])
    yourNewSheet.setFrozenRows(1)
    var studentNames = getRoster(courseId)["studentNames"]
    var studentEmails = getRoster(courseId)["studentEmails"]
    for (var i = 0; i < studentNames.length; i++) {
      yourNewSheet.appendRow([studentNames[i],studentEmails[i]])
    }
    yourNewSheet.autoResizeColumns(1, 2)
    yourNewSheet.setFrozenColumns(2)
  }

/*
  Description: Adds the course's students to the course sheet
  @param {String} courseId - Corresponding Classroom ID
*/
function getRoster(courseId) {
  var studentNames = []
  var studentEmails = []
  var optionalArgs = {
      pageSize: 100
  };
  var response = Classroom.Courses.Students.list(courseId, optionalArgs)
  var students = response.students

  for (var i = 0; i <= students.length; i++) {
    try {
      studentNames.push(students[i].profile.name.fullName)
      studentEmails.push(students[i].profile.emailAddress)
    } catch (err) {
       return { "studentNames":studentNames, "studentEmails":studentEmails }
   }
 }
}

/*
  Description: Retrieves the Meet code from the Course Sheet
  and uses helper function to check attendance
*/
function checkAll() {
  var ss = SpreadsheetApp.getActiveSheet();
  var sheet = ss.getDataRange().getValues();
  for (var i = 2; i < sheet.length * 100; i++){
    var meetCode = getCleanCode(sheet[0][i])
    // No Meet code given
    if (meetCode == null) {
      break;
    }
    else {
      // check whether each student was present in Meet
      checkMeet(meetCode, i+1);
    }
  }
}

/*
  Description: Checks the Meet for attendance of the given student
  @param {String} meetCode - Raw Meet Code from Course Sheet
  @param {Integer} index - Index corresponding to the Student's row
  in the Course Sheet
*/
function checkMeet(meetCode, index) {
  // universal settings - static
  var userKey = 'all';
  var applicationName = 'meet';
  var ss = SpreadsheetApp.getActiveSheet();
  var sheet = ss.getDataRange().getValues();
  for (var i = 0; i < sheet.length-1; i++) {
    var emailAddress = sheet[i+1][1]
    var optionalArgs = {
      event_name: "call_ended",
      filters: "identifier==" + emailAddress + ",meeting_code==" + meetCode
    };
    try {
      var response = AdminReports.Activities.list(userKey, applicationName, optionalArgs);
      var activities = response.items;
      if (activities == null) {
        markAbsent(ss,i+2,index)
      }
      else {
        markPresent(ss,i+2,index)
      }
    } catch (err) {
        continue
     }
  }
}

/*
  Description: Strips any "-' Characters to match needed format
  for Reports API
  @param {String} meetCode - Raw Meet Code from Course Sheet
*/
function getCleanCode(meetCode) {
  try{
    return meetCode.replace("/-/g","")
  } catch (err) { return meetCode; }
}

/*
  Description: Marks the student as absent for their corresponding cell
  @param {Object} sheet - Course Sheet object
  @param {Integer} i - Index of Sheet cell column to be filled
  @param {Integer} j - Index of Sheet cell row to be filled
*/
function markAbsent(sheet, i, j) {
    var cell = sheet.getRange(i, j);
    cell.setValue("Absent");
}

/*
  Description: Marks the student as absent for their corresponding cell
  @param {Object} sheet - Course Sheet object
  @param {Integer} i - Index of Sheet cell column to be filled
  @param {Integer} j - Index of Sheet cell row to be filled
*/
function markPresent(sheet, i, j) {
    var cell = sheet.getRange(i, j);
    cell.setValue("Present");
}