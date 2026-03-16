import PyPDF2
from pathlib import Path

pdf_path = r'C:\Users\QV5755\Downloads\00.PERSO\App_Python\CABLES\NF C15-100-1.pdf'
out_dir = Path(r'C:\Users\QV5755\Downloads\00.PERSO\App_Python\CABLES\extracted_texts')
out_dir.mkdir(exist_ok=True)

keywords = [
    'Tableau 52.8', 'Tableau 52.9', 'Tableau 52.10', 'Tableau 52.11',
    'Tableau 52.12', 'Tableau 52.13', 'Tableau 52.14', 'Tableau 52.15',
    'Tableau 52.16', 'Tableau 52.17', 'Tableau 52.18', 'Tableau 523.7',
    'Tableau 523.6.3', 'Tableau 52.20', 'Tableau 42.3', 'Tableau 512.2.11'
]

with open(pdf_path, 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    for i in range(len(reader.pages)):
        page = reader.pages[i]
        text = page.extract_text()
        if not text: continue
        for kw in keywords:
            if kw in text:
                filename = f"page_{i+1}_{kw.replace('.', '_').replace(' ', '_')}.txt"
                with open(out_dir / filename, 'w', encoding='utf-8') as out:
                    out.write(text)
                break
