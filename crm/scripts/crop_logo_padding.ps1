$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public class ImageCropper {
    public static void CropTransparentPadding(string filePath) {
        byte[] fileBytes = File.ReadAllBytes(filePath);
        using (MemoryStream ms = new MemoryStream(fileBytes))
        using (Bitmap bmp = new Bitmap(ms)) {
            int w = bmp.Width;
            int h = bmp.Height;

            BitmapData data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int bytes = Math.Abs(data.Stride) * h;
            byte[] rgbValues = new byte[bytes];
            Marshal.Copy(data.Scan0, rgbValues, 0, bytes);
            bmp.UnlockBits(data);

            int minX = w, minY = h, maxX = 0, maxY = 0;
            bool foundAny = false;

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int idx = (y * w + x) * 4;
                    byte alpha = rgbValues[idx + 3];
                    if (alpha > 10) { // Non-transparent pixel
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        foundAny = true;
                    }
                }
            }

            if (!foundAny) return;

            int cropW = maxX - minX + 1;
            int cropH = maxY - minY + 1;

            using (Bitmap cropped = new Bitmap(cropW, cropH, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(cropped)) {
                    g.DrawImage(bmp, new Rectangle(0, 0, cropW, cropH), new Rectangle(minX, minY, cropW, cropH), GraphicsUnit.Pixel);
                }
                cropped.Save(filePath, ImageFormat.Png);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$srcDir = "C:\Users\Isaiah Mpofu\.gemini\antigravity\scratch\edits\metrics3d\site\assets\clients"

$files = Get-ChildItem $srcDir -Filter "*.png"

foreach ($file in $files) {
    Write-Host "Tight cropping: $($file.Name)..."
    [ImageCropper]::CropTransparentPadding($file.FullName)
}

Write-Host "All transparent logos tightly cropped!"
