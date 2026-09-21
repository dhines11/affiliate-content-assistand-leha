{/* MAIN POST SECTION */}
{data?.main_post && (
  <div className="space-y-3">
    <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
      MAIN POST ({Array.isArray(data.main_post) ? data.main_post.length : 1} OPTIONS)
    </h3>

    <div className="space-y-3">
      {Array.isArray(data.main_post) ? (
        data.main_post.map((post: string, index: number) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-sm"
          >
            <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-2">
              OPTION {index + 1}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {post}
            </p>
          </div>
        ))
      ) : (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200">
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {data.main_post}
          </p>
        </div>
      )}
    </div>
  </div>
)}
