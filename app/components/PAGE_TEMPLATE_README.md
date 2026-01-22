# Clemelopy Page Template System

A reusable component system for creating consistent, glassmorphic pages throughout the Clemelopy app.

---

## Components

| Component | Description |
|-----------|-------------|
| `PageHeader` | Glassmorphic header with two-tone title, subtitle, and optional Tour button |
| `PageContainer` | Glassmorphic content wrapper for main page content |

---

## Quick Start

```tsx
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';

export default function MyNewPage() {
  return (
    <Layout activeNav="tools">
      <main>
        <PageHeader
          titleStart="My"
          titleEnd="New Page"
          subtitle="Description of what this page does."
          centered={true}
          showTour={true}
          onTourClick={() => console.log('Tour clicked')}
        />

        <PageContainer>
          {/* Your content here */}
        </PageContainer>
      </main>
    </Layout>
  );
}
```

---

## PageHeader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `titleStart` | `string` | required | First part of title (black text) |
| `titleEnd` | `string` | required | Second part of title (gradient text) |
| `subtitle` | `string` | required | Description text below the title |
| `centered` | `boolean` | `true` | Center align the title and subtitle |
| `showTour` | `boolean` | `true` | Show/hide the Tour button |
| `onTourClick` | `() => void` | `undefined` | Callback when Tour button is clicked |

### Examples

**Centered with Tour button (default):**
```tsx
<PageHeader
  titleStart="Schema"
  titleEnd="Studio"
  subtitle="Create structured data markup so AI engines can understand and cite your content."
/>
```

**Left-aligned without Tour button:**
```tsx
<PageHeader
  titleStart="My"
  titleEnd="Projects"
  subtitle="View and manage all your generated strategies and reports."
  centered={false}
  showTour={false}
/>
```

---

## PageContainer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to render inside the container |
| `className` | `string` | `''` | Additional CSS classes |
| `padding` | `string` | `'32px'` | Custom padding value |

### Examples

**Default padding:**
```tsx
<PageContainer>
  <YourComponent />
</PageContainer>
```

**Custom padding:**
```tsx
<PageContainer padding="24px">
  <YourComponent />
</PageContainer>
```

**Multiple containers with spacing:**
```tsx
<PageContainer>
  <FirstSection />
</PageContainer>

<PageContainer className="mt-8">
  <SecondSection />
</PageContainer>
```

---

## Layout activeNav Options

When using the `Layout` component, set `activeNav` to one of these values:

| Value | Page |
|-------|------|
| `'workspace'` | Dashboard/Workspace |
| `'my-projects'` | My Projects |
| `'tools'` | Tools (Schema Studio, etc.) |
| `'linking-strategy'` | Linking Strategy |
| `'schema-studio'` | Schema Studio |
| `'learn'` | Learn/Resources |
| `'to-do'` | To-Do List |
| `'support'` | Support |
| `'settings'` | Settings |
| `'geo-framework'` | GEO Framework |

---

## Style Reference

### Fonts

```css
/* Headings */
fontFamily: 'Montserrat Alternates'

/* Body text */
fontFamily: 'Inter'
```

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary text | `#1a1a1a` | Main headings, important text |
| Secondary text | `#4a4642` | Body text, descriptions |
| Muted text | `#6b6560` | Hints, placeholders |
| Clemelopy Orange | `#FAA819` | Primary brand color |
| Clemelopy Orange Dark | `#E99502` | Gradient end, hover states |
| Clemelopy Teal | `#00A99D` | Secondary brand color |
| Clemelopy Teal Dark | `#0D7871` | Buttons, accents |
| Clemelopy Teal Darker | `#005a54` | Text on light backgrounds |

### Gradients

**Title gradient:**
```css
background: linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%);
```

**Teal button:**
```css
background: linear-gradient(135deg, #00A99D, #0D7871);
```

**Orange button:**
```css
background: linear-gradient(135deg, #FAA819, #E99502);
```

### Button Styles

**Teal (Primary Action):**
```tsx
style={{
  fontFamily: 'Montserrat Alternates',
  fontWeight: 500,
  background: 'linear-gradient(135deg, #00A99D, #0D7871)',
  color: 'white',
  borderRadius: '14px',
  padding: '12px 24px',
  boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
}}
```

**Orange (Secondary Action):**
```tsx
style={{
  fontFamily: 'Montserrat Alternates',
  fontWeight: 500,
  background: 'linear-gradient(135deg, #FAA819, #E99502)',
  color: 'white',
  borderRadius: '14px',
  padding: '12px 24px',
  boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
}}
```

**Glass Button:**
```tsx
style={{
  fontFamily: 'Montserrat Alternates',
  fontWeight: 500,
  background: 'rgba(255, 255, 255, 0.6)',
  border: '1px solid rgba(0, 169, 157, 0.3)',
  color: '#005a54',
  borderRadius: '14px',
  padding: '12px 24px',
}}
```

### Glassmorphic Styles

**Header container:**
```tsx
style={{
  background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 50%, rgba(0,169,157,0.05) 100%)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.7)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  borderRadius: '16px',
}}
```

**Main container:**
```tsx
style={{
  background: 'rgba(255, 255, 255, 0.25)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '32px',
  padding: '32px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
}}
```

**Card:**
```tsx
style={{
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  borderRadius: '20px',
  padding: '20px',
}}
```

---

## File Locations

```
app/
├── components/
│   ├── PageHeader.tsx      ← Header component
│   ├── PageContainer.tsx   ← Container component
│   ├── PAGE_TEMPLATE_README.md  ← This file
│   └── Layout.tsx          ← Main layout wrapper
```

---

## Creating a New Page

1. Create a new folder in `app/` (e.g., `app/my-new-feature/`)
2. Create `page.tsx` inside that folder
3. Copy the Quick Start code above
4. Update:
   - `activeNav` to match your navigation item
   - `titleStart` and `titleEnd` for your page title
   - `subtitle` for your page description
   - Content inside `PageContainer`

---

*Last updated: January 2026*
