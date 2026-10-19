---
name: 3S Party
description: ระบบส่งงาน ตรวจงาน และเช็คชื่อกิจกรรมชุมนุมสื่อสร้างสรรค์ (Creative Media Club Platform)
colors:
  primary: "#D9A441"
  secondary: "#C96B4B"
  destructive: "#B94E48"
  neutral-bg: "#FFF9F0"
  neutral-surface: "#FFFFFF"
  neutral-surface-subtle: "#FAF6F0"
  neutral-border: "#EADBCC"
  neutral-border-focus: "#D9CABB"
  text-primary: "#3F342B"
  text-secondary: "#7A6A5C"
  text-muted: "#A18F7F"
  text-accent: "#8C5D23"
typography:
  display:
    fontFamily: "Kanit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Kanit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Kanit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Kanit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Kanit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.025em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface-subtle}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.neutral-surface-subtle}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
---

# Design System: 3S Party

## Overview

**Creative North Star: "The Playful Maker Space"**

3S Party คือพื้นที่ปฏิบัติการและแพลตฟอร์มการเรียนรู้ร่วมกันของชุมนุมสื่อสร้างสรรค์ บรรยากาศทางสายตาถ่ายทอดพลังแห่งความกระตือรือร้น มีชีวิตชีวา และสนุกสนาน (Energetic & Playful) ผสานความอบอุ่น ละมุนตา สไตล์ "Warm Confection" ที่ให้ความรู้สึกปลอดภัยในการทดลองลงมือทำ เสมือนสตูดิโอคราฟต์ที่เปิดต้อนรับนักเรียนทุกคนให้เข้ามาร่วมสนุกและแบ่งปันผลงานสร้างสรรค์

ระบบนี้ปฏิเสธความแข็งกระด้างแบบซอฟต์แวร์สำนักงานราชการทั่วไป และปฏิเสธความมืดทึบแบบแดชบอร์ดเทคโนโลยีสายดาร์ก โดยมุ่งเน้นการใช้พื้นผิวสว่างนวลตาเหมือนกระดาษและขนมอบชั้นดี โทนสีเหลืองอำพันน้ำผึ้งและดินเผาที่กระตุ้นจินตนาการ พร้อมการจัดวางที่เข้าใจง่ายและลดภาระทางสมองของนักเรียนและครูผู้สอน

**Key Characteristics:**
- **Warm & Welcoming:** โทนสีครีมอบอุ่นสบายตา (Warm Milk `#FFF9F0`) พร้อมตัวหนังสือสีช็อกโกแลตเข้ม (Deep Cocoa `#3F342B`) ที่อ่านง่าย ไม่ล้าสายตา
- **Tactile & Inviting:** องค์ประกอบมีขอบโค้งมนนุ่มนวล (12px–24px) เหมือนงานคราฟต์ที่จับต้องได้
- **Flat & Clean Layering:** ความลึกเกิดจากการซ้อนเลเยอร์ของเฉดสีและเส้นแบ่งที่บางเบา ไม่พึ่งพาเงาหนาทึบ
- **Accessible & High Contrast:** ตัวอักษรและข้อมูลสำคัญมีความคมชัดสูง อ่านได้ชัดเจนในทุกสภาพแสง

## Colors

ชุดสี "Warm Confection" ได้รับแรงบันดาลใจจากความอบอุ่นของขนมอบและสตูดิโอคราฟต์ ให้ความรู้สึกมีชีวิตชีวาและเป็นกันเอง

### Primary
- **Honey Amber** (`#D9A441`): สีเหลืองอำพันสดใส ใช้เป็นจุดเด่นหลักของแบรนด์ ไอคอนไฮไลต์ และปุ่มหลัก (Primary Actions) เพื่อสร้างความกระตือรือร้น

### Secondary
- **Apricot Terracotta** (`#C96B4B`): สีดินเผาแอพริคอตอบอุ่น ใช้สำหรับหัวข้อรอง ป้ายสถานะที่ต้องการความโดดเด่น และ Badge แสดงผลกิจกรรม
- **Crimson Glaze** (`#B94E48`): สีแดงเบอร์รี่ ใช้สำหรับการแจ้งเตือน ปุ่มลบ/ยกเลิก (Destructive Actions) และสถานะค้างส่งงาน

### Neutral
- **Warm Milk** (`#FFF9F0`): สีพื้นหลังหลักของทั้งระบบ ให้ความรู้สึกนวลตา สบายใจ และเป็นมิตร
- **Whipped White** (`#FFFFFF`): สีพื้นผิวของการ์ดข้อมูลหลัก กล่องเนื้อหา และหน้าต่างแบบฟอร์ม
- **Biscuit Tint** (`#FAF6F0`): สีพื้นผิวเลเยอร์รอง พื้นหลังช่องกรอกข้อมูล (Input) และตารางข้อมูล
- **Toasted Almond** (`#D9CABB`): สีเส้นขอบกล่องกรอกข้อมูลและปุ่มควบคุม ช่วยเน้นโครงสร้างให้ชัดเจน
- **Waffle Sand** (`#EADBCC`): สีเส้นขอบการ์ด เส้นแบ่งตาราง และโครงสร้างแผงควบคุม
- **Deep Cocoa** (`#3F342B`): สีข้อความหลัก มีความเข้มคมชัดและละมุนกว่าสีดำสนิท
- **Warm Espresso Muted** (`#7A6A5C`): สีข้อความรอง คำอธิบายใต้หัวข้อ และไอคอนเสริม
- **Roasted Ochre** (`#8C5D23`): สีข้อความเน้นพิเศษสำหรับจุดที่ต้องการฟีลลิ่งสีทอง แต่ต้องคมชัดผ่านเกณฑ์ WCAG AA

### Named Rules
**The High-Contrast Readability Rule.** สีเหลือง Honey Amber (`#D9A441`) อนุญาตให้ใช้เฉพาะกับไอคอนตกแต่ง ป้ายขนาดใหญ่ หรือปุ่มที่มีพื้นหลังทึบเท่านั้น ห้ามใช้ `#D9A441` เป็นสีตัวหนังสือบนพื้นขาวหรือพื้นครีมโดยเด็ดขาด หากต้องการข้อความเน้นโทนสีทอง ให้ใช้ Roasted Ochre (`#8C5D23`) หรือ Deep Cocoa (`#3F342B`) เสมอเพื่อให้อัตราส่วนคอนทราสต์ไม่ต่ำกว่า 4.5:1

**The Warm Baseline Rule.** ห้ามใช้สีขาวบริสุทธิ์ (`#FFFFFF`) เป็นสีพื้นหลังหน้าจอ (Page Canvas) พื้นหลังของแอปพลิเคชันต้องเริ่มต้นด้วย Warm Milk (`#FFF9F0`) เสมอ เพื่อรักษาความอบอุ่นสบายตาของห้องเรียน

## Typography

**Display & Body Font:** Kanit (ฟอนต์หลักประจำระบบ รองรับภาษาไทยและภาษาอังกฤษอย่างไร้รอยต่อ)
**Document Print Font:** Sarabun (ใช้เฉพาะโหมดเอกสารราชการและหน้ารายงาน PDF)

**Character:** โมเดิร์น มีพลัง ชัดเจน และเป็นมิตร ความโค้งของ Kanit เข้ากันได้อย่างสมบูรณ์กับรูปทรงขอบมนของคอมโพเนนต์

### Hierarchy
- **Display** (Bold 800, `clamp(2rem, 5vw, 3rem)`, `line-height: 1.2`): ข้อความพาดหัวหน้าแรก, Hero Section และคะแนนสถิติขนาดใหญ่
- **Headline** (Bold 700, `1.75rem / 28px`, `line-height: 1.25`): ชื่อหน้าหลัก, ชื่อโมดูลกิจกรรม
- **Title** (SemiBold 600, `1.25rem / 20px`, `line-height: 1.3`): หัวข้อการ์ด, ชื่อแบบฝึกหัด, ชื่อบทเรียน
- **Body** (Regular 400, `0.875rem / 14px`, `line-height: 1.5`): เนื้อหาบทความ, คำอธิบายโจทย์, ข้อมูลในตาราง (ความยาวบรรทัดสูงสุดไม่เกิน 70ch)
- **Label** (SemiBold 600, `0.75rem / 12px`, `letter-spacing: 0.025em`): ป้ายสถานะ, Badge, ชื่อคอลัมน์ตาราง และปุ่มกด

### Named Rules
**The Triple-Weight Rule.** ในการโหลดฟอนต์เว็บ ให้จำกัดการดึงน้ำหนักของ Kanit ไว้เพียง 3 น้ำหนักหลักเท่านั้น คือ 400 (เนื้อหา), 600 (หัวข้อย่อย/ป้าย), และ 700/800 (หัวข้อใหญ่) เพื่อป้องกันปัญหาหน้าเว็บโหลดช้า

## Layout

ระบบจัดวางอิงฐานกริด 4px (4px Baseline Grid) โดยเน้นความโล่งสบายตาและระยะหายใจที่เพียงพอ
- **Grid & Spacing:** ใช้สเกลมาตรฐาน 4px, 8px, 12px, 16px, 24px, 32px
- **Container System:** จัดกึ่งกลางหน้าจอพร้อม Padding ซ้าย-ขวา `px-4 sm:px-6 lg:px-8` โดยมีความกว้างสูงสุดจำกัดตามเนื้อหา:
  - แบบฟอร์มและล็อกอิน: `max-w-md` (448px)
  - แดชบอร์ดนักเรียน: `max-w-5xl` (1024px)
  - แผงควบคุมครู/แอดมิน: `max-w-7xl` (1280px)
- **Table Containment:** ตารางข้อมูลทั้งหมดต้องบรรจุอยู่ภายในคอนเทนเนอร์ที่มี `overflow-x-auto` เสมอ เพื่อป้องกันการล้นจอและรองรับการเลื่อนดูบนสมาร์ตโฟน

## Elevation & Depth

3S Party ยึดหลัก **เรียบแบนมินิมอล (Flat Clean Surfaces)** โดยความลึกและลำดับชั้นของข้อมูลจะถูกถ่ายทอดผ่านการซ้อนเลเยอร์สี (Tonal Layering) และเส้นขอบละเอียดอ่อน แทนการใช้เงาฟุ้งขนาดใหญ่

### Shadow Vocabulary
- **Subtle Surface** (`box-shadow: 0 1px 2px 0 rgba(63, 52, 43, 0.04)`): ใช้เฉพาะการ์ดหลักบนพื้นครีมเพื่อแยกชั้นอย่างแผ่วเบา
- **Lifted Focus** (`box-shadow: 0 4px 12px -2px rgba(217, 164, 65, 0.2)`): ใช้เฉพาะเมื่อปุ่มกดหรือช่อง Input ถูก Focus หรือกด Active

### Named Rules
**The Flat-By-Default Rule.** การ์ด แผงควบคุม และกล่องข้อมูลต้องมีสถานะแบนราบเป็นค่าเริ่มต้น การสร้างมิติให้ใช้เส้นขอบ Waffle Sand (`#EADBCC`) หนา 1px ผสานความต่างระหว่างสีพื้นหลัง Whipped White (`#FFFFFF`) กับ Biscuit Tint (`#FAF6F0`) เท่านั้น

## Shapes

รูปทรงของระบบสื่อถึงความอบอุ่น เป็นมิตร และเข้าถึงง่าย ไร้มุมแหลมคมที่ดูเคร่งเครียด
- **Inputs & Buttons:** โค้งมนระดับ `12px` (`rounded-xl`)
- **Badges & Avatars:** โค้งมนเต็มรูปแบบ `9999px` (`rounded-full`)
- **Cards & Dialogs:** โค้งมนขนาดใหญ่ `16px`–`24px` (`rounded-2xl` หรือ `rounded-3xl`)
- **Borders:** เส้นขอบรอบด้านหนา 1px สีละมุน ห้ามใช้เส้นขอบหนาเตอะหรือขอบด้านเดียวแบบ Side-Tab

## Components

### Buttons
- **Shape:** โค้งมนนุ่มนวล (`12px` / `rounded-xl`) มีพื้นที่กดขั้นต่ำไม่น้อยกว่า 44x44px บนมือถือ
- **Primary:** พื้นหลัง Honey Amber (`#D9A441`), ตัวหนังสือ Deep Cocoa (`#3F342B`) หนา 600, Padding แนวนอน 20px แนวตั้ง 10px, เมื่อ Hover ปรับโทนเข้มขึ้นและยกตัว 1px
- **Secondary:** พื้นหลัง Biscuit Tint (`#FAF6F0`), ขอบ Toasted Almond (`#D9CABB`), ตัวหนังสือ Deep Cocoa (`#3F342B`)
- **Destructive:** พื้นหลังสีแดง Crimson Glaze (`#B94E48`), ตัวหนังสือสีขาว, เมื่อ Hover ปรับโทนเข้ม

### Cards / Containers
- **Corner Style:** `rounded-2xl` (16px) ถึง `rounded-3xl` (24px)
- **Background:** พื้นผิวสีขาว Whipped White (`#FFFFFF`)
- **Border:** เส้นขอบ 1px สี Waffle Sand (`#EADBCC`)
- **Padding:** 16px ถึง 24px พร้อมการจัดช่องว่างภายในแบบชัดเจน

### Inputs / Fields
- **Style:** พื้นหลังสีครีมอ่อน Biscuit Tint (`#FAF6F0`), เส้นขอบ 1px สี Toasted Almond (`#D9CABB`), โค้งมน 12px
- **Typography:** ตัวหนังสือ Deep Cocoa (`#3F342B`), ข้อความ Placeholder ใช้สีโทนอุ่นที่อ่านออกได้ชัดเจน (`#7A6A5C`)
- **Focus:** วงแหวนเรืองแสงสีทอง 2px (`focus:ring-2 focus:ring-[#D9A441] focus:border-transparent`)
- **Accessibility:** ต้องมีแท็ก `<label htmlFor="...">` เชื่อมโยงกับ `id` ของ Input ทุกช่องเสมอ

### Navigation
- **Style:** แถบเนวิเกชันพื้นหลังสีขาวนวลหรือครีม พร้อมเส้นขอบล่างหรือขอบข้าง `#EADBCC`
- **Active State:** เมนูที่เลือกจะแสดงพื้นหลังสีทองอ่อนโปร่งแสง (`#D9A441/15`) พร้อมตัวหนังสือสีน้ำตาลเข้มและขอบมน

## Do's and Don'ts

### Do:
- **Do** ใช้สีพื้นหลัง Warm Milk (`#FFF9F0`) และสีตัวหนังสือ Deep Cocoa (`#3F342B`) เป็นมาตรฐานหลักของทุกหน้า
- **Do** ใช้ Roasted Ochre (`#8C5D23`) เสมอเมื่อต้องการเน้นสีทองบนข้อความ เพื่อให้ได้ Contrast Ratio ไม่ต่ำกว่า 4.5:1
- **Do** ใส่ `aria-label` หรือชื่อกำกับในปุ่มไอคอนทุกตัวที่ไม่มีข้อความกำกับ
- **Do** รองรับ `prefers-reduced-motion` ในแอนิเมชันทุกจุดเพื่อผู้ใช้งานที่ไวต่อการเคลื่อนไหว
- **Do** กำหนดพื้นที่สัมผัส (Touch Target) ของปุ่มและฟิลด์กรอกข้อมูลให้มีขนาดอย่างน้อย 44x44px บนหน้าจอมือถือ

### Don't:
- **Don't** ใช้สีเหลือง `#D9A441` เป็นสีตัวอักษรปกติบนพื้นหลังสีสว่างโดยเด็ดขาด
- **Don't** ใช้แอนิเมชันเด้งกระดอนแบบ `animate-bounce` ที่ทำให้สายตาล้า
- **Don't** ใช้เส้นขอบหนาด้านเดียวข้างการ์ด (Side-tab `border-l-4`) ซึ่งเป็นรูปแบบ UI เจนเนอเรตซ้ำซาก
- **Don't** ใช้สีดำทึบสนิท (`#000000`) หรือสีขาวบริสุทธิ์แบบแข็งกร้าว (`#FFFFFF`) บนพื้นหลังหน้าหลัก
- **Don't** ฮาร์ดโค้ดรหัสสี Hex แปลกแยกนอกเหนือจาก Palette หลักของ Warm Confection
