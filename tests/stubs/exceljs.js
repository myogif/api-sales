class Worksheet {
  constructor() {
    this.columns = [];
    this.rows = [];
  }

  getRow() {
    return {
      font: {},
      fill: {},
    };
  }

  addRow(data) {
    this.rows.push(data);
  }
}

class Workbook {
  constructor() {
    this.worksheets = [];
    this.xlsx = {
      write: async () => {},
    };
    Workbook.__lastWorkbook = this;
  }

  addWorksheet() {
    const sheet = new Worksheet();
    this.worksheets.push(sheet);
    return sheet;
  }
}

module.exports = {
  Workbook,
  __getLastWorkbook: () => Workbook.__lastWorkbook,
};
