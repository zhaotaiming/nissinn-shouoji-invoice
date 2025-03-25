// const correctPassword = "weiwei";
// let input;

// while (true) {
//   input = prompt("请输入密码：");
//   if (input === null) {
//     document.write("访问已取消。");
//     break;
//   } else if (input === correctPassword) {
//     break;
//   } else {
//     alert("密码错误，请重新输入！");
//   }
// }

let currentRowCount = 0;

let base64Font = '';

function loadFontData() {
  fetch('PDF-font-base64.txt')
    .then(response => response.text())
    .then(data => {
      base64Font = data;
      console.log("字体数据加载成功");
    })
    .catch(err => {
      console.error("加载字体数据失败:", err);
    });
}

function addRows(n) {
    const inputRows = document.getElementById('inputRows');
    for (let i = currentRowCount + 1; i <= currentRowCount + n; i++) {
      const row = document.createElement('div');
      row.classList.add('inputRow');
      row.innerHTML = `
        <div class="content">
          <label for="name${i}" class="label-content">内容品:</label>
          <input type="text" id="name${i}" name="name${i}" class="input-content">
        </div>

        <div class="quantity">
          <label for="quantity${i}" class="label-quantity">数量:</label>
          <input type="number" id="quantity${i}" name="quantity${i}" class="input-quantity">
        </div>

        <div class="price">
          <label for="price${i}" class="label-price">単価:</label>
          <input type="number" id="price${i}" name="price${i}" class="input-price">
        </div>
      `;
      inputRows.appendChild(row);
    }
    currentRowCount += n;
  }

document.addEventListener('DOMContentLoaded', () => {
    loadFontData();
    addRows(10);
  });

function generatePDF1() {
    const userName = document.getElementById('userName').value.trim();
    const date = document.getElementById('date').value.trim();
    const address1 = document.getElementById('address1').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
  
    if (!userName || !date || !address1 || !phoneNumber) {
      alert("名前、請求日、住所と電話番号を入力してください。");
      return;
    }
    
    if (!base64Font) {
      alert("字体数据正在加载，请稍后重试。");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.addFileToVFS('NotoSansJP-VariableFont_wght.ttf', base64Font);
    doc.addFont('NotoSansJP-VariableFont_wght.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    
    const postalCode = document.getElementById('postalCode').value || "";
    const address2 = document.getElementById('address2').value || "";
    const address3 = document.getElementById('address3').value || "";
    
    const rawRows = [];
    let totalAmount = 0;
    for (let i = 1; i <= currentRowCount; i++) {
      const name = document.getElementById(`name${i}`).value || "";
      const quantity = parseFloat(document.getElementById(`quantity${i}`).value) || 0;
      const price = parseFloat(document.getElementById(`price${i}`).value) || 0;
      const amount = price * quantity;
      totalAmount += amount;
      rawRows.push([name, price ? price : "", quantity ? quantity : "", amount ? amount : ""]);
    }
    
    const subtotal = Math.round(totalAmount / 1.1);
    const tax = Math.round(totalAmount - subtotal);
    const summaryRows = [
      ["小計", subtotal],
      ["消費税", tax],
      ["合計", totalAmount]
    ];
    
    const columns = ["内容品", "単価", "数量", "金額(税込み)"];
    
    const rowsPerPage = 10;
    const numPages = Math.ceil(rawRows.length / rowsPerPage) || 1;  // 至少1页
    
    for (let p = 0; p < numPages; p++) {
      if (p > 0) {
        doc.addPage();
      }
      printPageHeader(doc, { userName, date, postalCode, address1, address2, address3, phoneNumber });
      
      let startIdx = p * rowsPerPage;
      let pageRows = rawRows.slice(startIdx, startIdx + rowsPerPage);
      while (pageRows.length < rowsPerPage) {
        pageRows.push(["", "", "", ""]);
      }
      
      const tableStartY = 125;
      doc.autoTable({
        head: [columns],
        body: pageRows,
        startY: tableStartY,
        tableWidth: 500,
        columnStyles: {
          0: { cellWidth: 105 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 }
        },
        headStyles: { font: 'NotoSans', fontStyle: 'normal', fillColor: [187, 187, 185], textColor: [0, 0, 0] },
        bodyStyles: { font: 'NotoSans', fontStyle: 'normal', fillColor: [255, 255, 255] },
        styles: { font: 'NotoSans', fontStyle: 'normal', lineWidth: 0.1, lineColor: [0, 0, 0] }
      });
      
      let finalY = doc.autoTable.previous.finalY;
      doc.autoTable({
        body: summaryRows,
        startY: finalY + 12,
        tableWidth: 500,
        margin: { left: 144 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 }
        },
        bodyStyles: { fillColor: [255, 255, 255] },
        styles: { font: 'NotoSans', fontStyle: 'normal', lineWidth: 0.1, lineColor: [0, 0, 0] },
        didDrawCell: function(data) {
          if (data.column.index === 0) {
            doc.setFillColor(187, 187, 185);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(0, 0, 0);
            const textY = data.cell.y + (data.cell.height / 2) + (doc.getFontSize() / 2) - 4;
            doc.text(data.cell.text[0], data.cell.x + 2, textY);
          }
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.1);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      });
      
      const note = document.getElementById('note').value || "";
      let noteY = doc.autoTable.previous.finalY + 10;
      doc.setLineWidth(0.5);
      doc.rect(15, noteY, 180, 30);
      doc.text("備考欄", 25, noteY + 10);
      if (note) {
        doc.text(note, 25, noteY + 20);
      }
    }
    
    const safeFileName = userName.replace(/[\\/:*?"<>|]/g, '');
    doc.save(safeFileName ? `${safeFileName}.pdf` : '請求書.pdf');
  }

function generatePDF2() {
    const userName = document.getElementById('userName').value.trim();
    const date = document.getElementById('date').value.trim();
    const address1 = document.getElementById('address1').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
  
    if (!userName || !date || !address1 || !phoneNumber) {
      alert("名前、請求日、住所と電話番号を入力してください。");
      return;
    }
    
    if (!base64Font) {
      alert("字体数据正在加载，请稍后重试。");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.addFileToVFS('NotoSansJP-VariableFont_wght.ttf', base64Font);
    doc.addFont('NotoSansJP-VariableFont_wght.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    
    const postalCode = document.getElementById('postalCode').value || "";
    const address2 = document.getElementById('address2').value || "";
    const address3 = document.getElementById('address3').value || "";
    
    const rawRows = [];
    let totalAmount = 0;
    for (let i = 1; i <= currentRowCount; i++) {
      const name = document.getElementById(`name${i}`).value || "";
      const quantity = parseFloat(document.getElementById(`quantity${i}`).value) || 0;
      const price = parseFloat(document.getElementById(`price${i}`).value) || 0;
      const amount = price * quantity;
      totalAmount += amount;
      rawRows.push([name, price ? price : "", quantity ? quantity : "", amount ? amount : ""]);
    }
    
    const subtotal = Math.round(totalAmount / 1.1);
    const tax = Math.round(totalAmount - subtotal);
    const summaryRows = [
      ["小計", subtotal],
      ["消費税", tax],
      ["合計", totalAmount]
    ];
    
    const columns = ["内容品", "単価", "数量", "金額(税込み)"];
    
    const rowsPerPage = 10;
    const numPages = Math.ceil(rawRows.length / rowsPerPage) || 1;  // 至少1页
    
    for (let p = 0; p < numPages; p++) {
      if (p > 0) {
        doc.addPage();
      }
      printPageHeader2(doc, { userName, date, postalCode, address1, address2, address3, phoneNumber });
      
      let startIdx = p * rowsPerPage;
      let pageRows = rawRows.slice(startIdx, startIdx + rowsPerPage);
      while (pageRows.length < rowsPerPage) {
        pageRows.push(["", "", "", ""]);
      }
      
      const tableStartY = 125;
      doc.autoTable({
        head: [columns],
        body: pageRows,
        startY: tableStartY,
        tableWidth: 500,
        columnStyles: {
          0: { cellWidth: 105 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 }
        },
        headStyles: { font: 'NotoSans', fontStyle: 'normal', fillColor: [187, 187, 185], textColor: [0, 0, 0] },
        bodyStyles: { font: 'NotoSans', fontStyle: 'normal', fillColor: [255, 255, 255] },
        styles: { font: 'NotoSans', fontStyle: 'normal', lineWidth: 0.1, lineColor: [0, 0, 0] }
      });
      
      let finalY = doc.autoTable.previous.finalY;
      doc.autoTable({
        body: summaryRows,
        startY: finalY + 12,
        tableWidth: 500,
        margin: { left: 144 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 }
        },
        bodyStyles: { fillColor: [255, 255, 255] },
        styles: { font: 'NotoSans', fontStyle: 'normal', lineWidth: 0.1, lineColor: [0, 0, 0] },
        didDrawCell: function(data) {
          if (data.column.index === 0) {
            doc.setFillColor(187, 187, 185);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(0, 0, 0);
            const textY = data.cell.y + (data.cell.height / 2) + (doc.getFontSize() / 2) - 4;
            doc.text(data.cell.text[0], data.cell.x + 2, textY);
          }
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.1);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
      });
      
      const note = document.getElementById('note').value || "";
      let noteY = doc.autoTable.previous.finalY + 10;
      doc.setLineWidth(0.5);
      doc.rect(15, noteY, 180, 30);
      doc.text("備考欄", 25, noteY + 10);
      if (note) {
        doc.text(note, 25, noteY + 20);
      }
    }
    
    const safeFileName = userName.replace(/[\\/:*?"<>|]/g, '');
    doc.save(safeFileName ? `${safeFileName}.pdf` : '請求書.pdf');
  }
  
function printPageHeader(doc, info) {
    doc.setFontSize(32);
    doc.text("請求書", 105, 30, { align: 'center' });
    doc.setFontSize(18);
    doc.text(info.userName, 20, 50);
    doc.setFontSize(12);
    doc.text('請求日', 125, 50);
    doc.text(info.date, 180, 50, { align: 'right' });
    doc.text('登録番号', 141.5, 57, { align: 'right' });
    doc.text('T8030001154974', 180, 57, { align: 'right' });
    doc.setFontSize(16);
    doc.text('日新商事株式会社', 170, 80, { align: 'right' });
    doc.setFontSize(12);
    doc.text('〒 338-0832', 146.5, 87, { align: 'right' });
    doc.text('埼玉県さいたま市桜区', 173, 94, { align: 'right' });
    doc.text('西堀4-1-1-717', 156.5, 101, { align: 'right' });
    doc.text('℡ 070-1381-6677', 157, 108, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(20, 55, 110, 55);
    doc.text("様", 100, 50);
    
    let currentY = 65;
    if (info.postalCode) {
      doc.text(info.postalCode, 20, currentY);
      currentY += 7;
    }
    if (info.address1) {
      doc.text(info.address1, 20, currentY);
      currentY += 7;
    }
    if (info.address2) {
      doc.text(info.address2, 20, currentY);
      currentY += 7;
    }
    if (info.address3) {
      doc.text(info.address3, 20, currentY);
      currentY += 7;
    }
    if (info.phoneNumber) {
      doc.text(info.phoneNumber, 20, currentY);
    }
  }

  function printPageHeader2(doc, info) {
    doc.setFontSize(32);
    doc.text("請求書", 105, 30, { align: 'center' });
    doc.setFontSize(18);
    doc.text(info.userName, 20, 50);
    doc.setFontSize(12);
    doc.text('請求日', 125, 50);
    doc.text(info.date, 180, 50, { align: 'right' });
    doc.setFontSize(16);
    doc.text('高橋 美沙', 148, 80, { align: 'right' });
    doc.setFontSize(12);
    doc.text('〒 338-0832', 146.5, 87, { align: 'right' });
    doc.text('埼玉県さいたま市桜区', 173, 94, { align: 'right' });
    doc.text('西堀4-1-1-717', 156.5, 101, { align: 'right' });
    doc.text('℡ 070-1381-6677', 157, 108, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(20, 55, 110, 55);
    doc.text("様", 100, 50);
    
    let currentY = 65;
    if (info.postalCode) {
      doc.text(info.postalCode, 20, currentY);
      currentY += 7;
    }
    if (info.address1) {
      doc.text(info.address1, 20, currentY);
      currentY += 7;
    }
    if (info.address2) {
      doc.text(info.address2, 20, currentY);
      currentY += 7;
    }
    if (info.address3) {
      doc.text(info.address3, 20, currentY);
      currentY += 7;
    }
    if (info.phoneNumber) {
      doc.text(info.phoneNumber, 20, currentY);
    }
  }

function exportToExcel() {
  // 获取用户输入数据
  const userName = document.getElementById('userName').value.trim();
  const date = document.getElementById('date').value.trim();
  const address1 = document.getElementById('address1').value.trim();
  const address2 = document.getElementById('address2').value.trim();
  const address3 = document.getElementById('address3').value.trim();
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  const note = document.getElementById('note').value.trim();

  const rows = [];
  let totalAmount = 0;
  for (let i = 1; i <= 10; i++) {
    const name = document.getElementById(`name${i}`).value || "";
    const quantity = parseFloat(document.getElementById(`quantity${i}`).value) || 0;
    const price = parseFloat(document.getElementById(`price${i}`).value) || 0;
    const amount = price * quantity;
    totalAmount += amount;
    if (name) {
      rows.push([name, price.toFixed(2), quantity, amount.toFixed(2)]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([
    ["名字", "日期", "地址1", "地址2", "地址3", "联系电话", "備考欄"],
    [userName, date, address1, address2, address3, phoneNumber, note],
    [],
    ["内容品", "単価", "数量", "金額(税込み)"],
    ...rows,
    [],
    ["小計", (totalAmount / 1.1).toFixed(2)],
    ["消費税", (totalAmount - (totalAmount / 1.1)).toFixed(2)],
    ["合計", totalAmount.toFixed(2)]
  ]);

  ws['!cols'] = [
    { wpx: 100 },
    { wpx: 80 },
    { wpx: 100 },
    { wpx: 100 },
    { wpx: 100 },
    { wpx: 100 },
    { wpx: 150 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "請求書");

  const safeFileName = userName.replace(/[\\/:*?"<>|]/g, '');
  XLSX.writeFile(wb, safeFileName ? `${safeFileName}.xlsx` : '請求書.xlsx');
}
