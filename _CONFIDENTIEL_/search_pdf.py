
import sys
import os

try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not found. Attempting to use a different approach or install it.")
    os.system('pip install PyPDF2')
    import PyPDF2

def search_pdf(file_path, keywords, output_file):
    print(f"Searching for {keywords} in {file_path}")
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    results = []
    with open(file_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        num_pages = len(reader.pages)
        
        for i in range(num_pages):
            page = reader.pages[i]
            text = page.extract_text()
            if any(kw.lower() in text.lower() for kw in keywords):
                match_text = f"--- Match found on page {i+1} ---\n"
                for kw in keywords:
                    if kw.lower() in text.lower():
                        start_idx = text.lower().find(kw.lower())
                        match_text += text[max(0, start_idx-500):min(len(text), start_idx+1000)]
                        match_text += "\n" + "-" * 50 + "\n"
                results.append(match_text)
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("\n".join(results))
    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    pdf_path = r"c:\Users\QV5755\Downloads\00.PERSO\App_Python\CABLES\NF C15-100-1.pdf"
    output_path = r"C:\Users\QV5755\Downloads\00.PERSO\App_Python\CABLES\matches.txt"
    search_pdf(pdf_path, ["section minimale", "524", "courant admissible"], output_path)
