if __name__ == '__main__':
    print("<div style=\"margin:2em; background-color: #e0e0e0;\">", end="\n\n")
    try:
        lines = []
        while True:
            try:
                line = input()
                lines.append(line)
            except EOFError:
                break
        
        output = '<strong>⚠️NOTE️️️⚠️</strong>\n\n' + '\n'.join(lines).strip()
        print(output, end='\n')
    finally:
        print("</div>", end="\n\n")