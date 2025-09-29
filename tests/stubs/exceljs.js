class Worksheet {
  constructor() {
    this.columns = [];
  }

  getRow() {
    return {
      font: {},
      fill: {},
    };
  }

  addRow() {}
}

class Workbook {
  constructor() {
    this.worksheets = [];
    this.xlsx = {
      write: async () => {},
    };
  }

  addWorksheet() {
    const sheet = new Worksheet();
    this.worksheets.push(sheet);
    return sheet;
  }
}

module.exports = {
  Workbook,
};
