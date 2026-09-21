{/* MAIN POST SECTION - INDIVIDUAL BOXES */}
{data?.main_post && (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
      MAIN POST OPTIONS
    </h3>

    <div className="space-y-3">
      {/* Ensures every post renders in its OWN separate box */}
      {(Array.isArray(data.main_post)
        ? data.main_post
        : typeof data.main_post === "string"
        ? (data.main_post as string).split("\n\n\n")
        : []
      ).map((post: string, index: number) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-sm space-y-2"
        >
          <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
            OPTION {index + 1}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-200">
            {post.trim()}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
