export const dynamic = 'force-dynamic'
export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  console.log('✨ ChapterLayout mounted for ID segment')
  return (
    <>
      {/* VISUAL MARKER: you should see this on every chapter load */}
      <div style={{ position: 'absolute', top: 0, left: 0, padding: '4px', background: 'lightgreen', zIndex: 9999 }}>
        ChapterLayout ACTIVE
      </div>
      {children}
    </>
  )
}