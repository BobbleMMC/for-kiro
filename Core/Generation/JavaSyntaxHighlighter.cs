using System;
using System.Text.RegularExpressions;

public static class JavaSyntaxHighlighter
{
    private const string ColorKeyword = "#CC7832";    // public, class (To'q sariq)
    private const string ColorAnnotation = "#BBB529"; // @Override (Sariq)
    private const string ColorType = "#9876AA";       // Block, String (Binafsha)
    private const string ColorString = "#6A8759";     // "mymod" (Yashil)
    private const string ColorNumber = "#6897BB";     // 5.0f (Ko'k)
    private const string ColorComment = "#808080";    // // izohlar (Kulrang)

    public static string HighlightJavaCode(string rawCode)
    {
        if (string.IsNullOrEmpty(rawCode)) return "";

        string text = rawCode.Replace("<", "&lt;").Replace(">", "&gt;");

        // Hex rang kodlari ichidagi sonlar bilan to'qnashmaslik uchun murakkab xavfsiz Regex
        string pattern = @"(?<comment>//.*)|(?<string>""[^""]*"")|(?<annotation>@[A-Za-z]+)|(?<number>\b\d+(?:\.\d+)?f?\b)|(?<word>\b[A-Za-z_][A-Za-z0-9_]*\b)";

        text = Regex.Replace(text, pattern, match =>
        {
            if (match.Groups["comment"].Success) return $"<color={ColorComment}>{match.Value}</color>";
            if (match.Groups["string"].Success) return $"<color={ColorString}>{match.Value}</color>";
            if (match.Groups["annotation"].Success) return $"<color={ColorAnnotation}>{match.Value}</color>";
            
            // Xavfsiz son bo'yash: raqam faqat mustaqil turgandagina ko'k rangga bo'yaladi
            if (match.Groups["number"].Success) return $"<color={ColorNumber}>{match.Value}</color>";
            if (match.Groups["word"].Success) return HighlightWord(match.Value);

            return match.Value;
        });

        return text;
    }

    private static string HighlightWord(string word)
    {
        switch (word)
        {
            case "package": case "import": case "public": case "private": 
            case "protected": case "class": case "interface": case "static": 
            case "final": case "void": case "return": case "new": case "override":
                return $"<color={ColorKeyword}>{word}</color>";
        }

        // Agar so'z to'liq katta harf bo'lsa (Dasturchi yozgan Blok ID doimiysi)
        if (word.Length > 1 && word == word.ToUpper() && !char.IsDigit(word[0]))
        {
            return $"<color={ColorType}>{word}</color>";
        }

        return word;
    }
}
