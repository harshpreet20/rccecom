import { NextResponse } from "next/server";
import { loadDataWithFallback, getMyStats, getCompetitorStats } from "@/lib/admin/data";
import { askClaude } from "@/lib/admin/claude";
import { saveReport, createAdminClient } from "@/lib/admin/supabase-server";
import { getLearnings, buildEnhancedPrompt } from "@/lib/admin/micro-intel";
import { buildBrainContext, injectBrainContext } from "@/lib/admin/brain";

export const maxDuration = 180;

const QUALITY_PRESETS: Record<string, { label: string; fps: number; resolution: string; detail: string }> = {
  social: {
    label: "Social Video (24 fps)",
    fps: 24,
    resolution: "1080x1920 (9:16 vertical)",
    detail: "Instagram Reels optimized. 24 fps cinematic feel, 5-15 second scenes, bold colors. Under 50MB.",
  },
  standard: {
    label: "Standard (30 fps)",
    fps: 30,
    resolution: "1080x1920 (9:16 vertical)",
    detail: "Balanced quality/size. 30 fps smooth motion, good for most content. Standard compression.",
  },
  cinematic: {
    label: "Cinematic (60 fps)",
    fps: 60,
    resolution: "2160x3840 (4K vertical)",
    detail: "Premium quality. 60 fps ultra-smooth for dramatic reveals and slow-motion. Film grain, volumetric lighting, lens aberration. Max quality render.",
  },
  slowmo: {
    label: "Ultra Slow-Mo (120 fps)",
    fps: 120,
    resolution: "2160x3840 (4K)",
    detail: "120 fps extreme slow-motion for shuttlecock flight, racquet swings, impact moments. Every frame counts. Highest possible detail and temporal resolution.",
  },
};

function buildSystemPrompt(quality: string, sponsorHandle: string) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.social;

  return `You are the SPONSOR AI REEL PROMPT agent. You write EXTREMELY DETAILED AI video production prompts for sponsor activation content between @racquetsclubcommunity and @${sponsorHandle}.

Every prompt must integrate the sponsor brand visually - include sponsor brand colors, logo placement opportunities, and product integration in the scenes. The sponsor should be a natural part of the visual storytelling, not a forced overlay.

QUALITY PRESET: ${preset.label}
- Frame rate: ${preset.fps} fps
- Resolution: ${preset.resolution}
- ${preset.detail}

For each reel concept, write an EXHAUSTIVE production prompt covering ALL of these specs in extreme detail:

1. VISUAL STYLE: Photorealistic / 3D Render / Motion Graphics / Anime / Cinematic / Flat Vector / Mixed Media. Specify the exact aesthetic reference (e.g., "Blade Runner 2049 neon noir" or "Apple product launch clean minimalism"). Name specific visual references.

2. CAMERA WORK (frame by frame):
   - Shot type: Extreme wide / wide / medium / close-up / extreme close-up / macro
   - Movement: Static / pan (direction + speed) / dolly (in/out) / orbit (CW/CCW + degrees) / crane (up/down) / handheld / steadicam / whip pan
   - Angle: Bird's eye / high / eye-level / low / worm's eye / Dutch tilt (degrees)
   - Lens: Focal length (24mm wide / 50mm standard / 85mm portrait / 200mm telephoto), aperture (f/1.4 bokeh / f/8 sharp), anamorphic vs spherical
   - At ${preset.fps} fps: specify motion cadence - smooth glide, staccato cuts, speed ramps (from X fps to Y fps at timestamp)

3. LIGHTING (per scene):
   - Key light: Direction (front/side/back/top), intensity, color temperature (2700K warm / 5600K daylight / 8000K cool), hard vs soft, modifier (softbox/beauty dish/bare bulb)
   - Fill light: Ratio to key (1:2, 1:4), color, position
   - Rim/back light: Color, intensity, purpose (separation/halo/silhouette)
   - Practical lights: In-scene light sources (neon signs, screens, spotlights, fire)
   - Ambient: Time of day, weather, atmospheric haze/fog density
   - Special: God rays, lens flares (natural vs anamorphic), caustics, volumetric fog

4. SCENE & ENVIRONMENT:
   - Location: Specific setting described in detail (indoor court type, outdoor environment, fantasy/abstract space)
   - Background: Layers (foreground elements, mid-ground, background, sky/ceiling)
   - Props: Every object in frame, material/texture description - INCLUDING SPONSOR PRODUCT/BRANDING PLACEMENT
   - Atmosphere: Dust particles, smoke, rain, snow, heat haze
   - Depth of field: Focus distance, bokeh shape, background blur amount
   - Scale reference: Objects or measurements to establish spatial relationships

5. CHARACTERS & SUBJECTS:
   - Appearance: Ethnicity, age range, build, hair, skin detail
   - Wardrobe: Exact clothing description, fabric, color, fit, brand style reference - INCLUDE SPONSOR BRANDED APPAREL/GEAR WHERE RELEVANT
   - Pose: Body position, weight distribution, gesture, hand placement
   - Expression: Specific emotion, eye direction, mouth position
   - Motion: Movement arc described frame-by-frame for key actions, speed, easing (ease-in/ease-out/linear)
   - Interaction: With props, other characters, camera (4th wall), SPONSOR PRODUCTS

6. ANIMATION & TIMING:
   - Duration: Total seconds, broken into scenes/beats
   - Tempo: BPM reference for cuts, movement rhythm
   - Speed: Normal / slow-motion (specify multiplier like 0.25x) / timelapse / speed ramp timestamps
   - Transitions: Cut / dissolve / morph / whip / zoom / match cut (describe both frames)
   - Keyframes: Describe start pose, peak action, and end pose for each movement at ${preset.fps} fps

7. VFX & POST-PRODUCTION:
   - Particle effects: Type (sparks, embers, confetti, feathers, shuttlecock trails), density, direction, color, lifespan
   - Glow/bloom: Intensity, color, threshold
   - Motion trails: Length, opacity falloff, color
   - Text overlays: Font style, size, animation (typewriter/fade/slide), position, timing - INCLUDE SPONSOR LOGO/TEXT ANIMATIONS
   - Color grading: LUT reference or manual (lift/gamma/gain), saturation, contrast curve, teal-orange split
   - Film effects: Grain amount/size, halation, vignette, chromatic aberration, barrel distortion
   - Lens effects: Flares (anamorphic streak/orb), bokeh shape (circular/cat-eye/hexagonal), diffusion

8. CGI ELEMENTS:
   - 3D objects: Exact geometry, material (PBR: albedo, roughness, metalness, normal map description)
   - Physics: Gravity, wind, cloth sim, rigid body, fluid
   - Shuttlecock: Flight path arc, spin RPM, feather flutter, trail effect
   - Court: Surface material (wooden/synthetic/concrete), reflections, wear patterns
   - Equipment: Racquet model detail, string pattern, grip texture
   - SPONSOR PRODUCTS: 3D product renders, packaging, logo geometry

9. COLOR PALETTE:
   - Primary: Hex code + name + where used
   - Secondary: Hex code + name + where used
   - Accent: Hex code + name + where used
   - SPONSOR BRAND COLORS: Integrate sponsor brand palette into the scene naturally
   - Mood board reference: Name 2-3 specific films/ads/artists as visual references

10. SOUND DESIGN (detailed):
    - Music: Genre, BPM, key, mood, specific reference track if possible
    - SFX: Every sound cue with timestamp - whoosh, impact, ambient, foley
    - Voice: If any - tone, pace, accent, processing (reverb/echo/radio effect)
    - Mix: Levels balance, spatial audio notes (stereo/surround), bass emphasis points

11. TOOL RECOMMENDATION:
    - Primary tool: (Runway Gen-3 Alpha / Kling 1.5 / Pika 1.0 / Midjourney v6 + Runway / Sora / Luma Dream Machine / Stable Video Diffusion) and WHY this tool is best for this specific concept
    - Secondary tool: Backup recommendation if primary unavailable
    - Workflow: Step-by-step generation process (e.g., "Generate hero frame in Midjourney, animate in Runway, composite text in After Effects")

12. THE ACTUAL PROMPT:
    - A ready-to-paste prompt optimized for the recommended tool's specific syntax and token limits
    - Include negative prompts where the tool supports them
    - Include all relevant parameters (aspect ratio, duration, seed, motion intensity, camera control settings)
    - ENSURE SPONSOR BRAND ELEMENTS are described in the prompt

Generate 4-5 AI reel production prompts for sponsor activation content. Each must be a completely different visual concept that integrates the sponsor brand into badminton/racquet sports content. Think cinematic, eye-catching, scroll-stopping visuals with natural sponsor integration.

Output a clean HTML report with inline styles:
- A heading "Sponsor Activation - AI Reel Production Prompts" with a subtitle showing the quality preset (${preset.label}) and sponsor name
- For each reel, a detailed production card with ALL specs above laid out in clearly labeled sections
- Include a highlighted "Copy-Paste Prompt" box at the bottom of each card in a monospace styled box with a dark background
- Show the tool workflow steps visually
- Use orange (#F97316) and violet (#8B5CF6) accents
- Clean white cards with subtle borders and shadows

CRITICAL FORMAT RULES:
- Output ONLY raw HTML. No markdown, no code fences, no backticks, no text before or after the HTML.
- Never use em dashes or en dashes. Use " - " instead.
- Your entire response must start with < and end with >. Nothing else.`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sponsorHandle = (body.sponsorHandle || "").trim().replace(/^@/, "");
  if (!sponsorHandle) return NextResponse.json({ error: "Missing sponsorHandle" }, { status: 400 });

  const quality = ["social", "standard", "cinematic", "slowmo"].includes(body.quality) ? body.quality : "social";

  const supabase = createAdminClient();
  const { data: sponsorRow } = await supabase
    .from("sponsor_scrapes")
    .select("data")
    .eq("sponsor_handle", sponsorHandle)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single();
  if (!sponsorRow) return NextResponse.json({ error: "No sponsor data. Scrape first." }, { status: 404 });
  const sponsor = sponsorRow.data;

  const data = await loadDataWithFallback();
  if (!data) return NextResponse.json({ error: "No data. Run scrape first." }, { status: 404 });

  const me = getMyStats(data);
  const competitors = getCompetitorStats(data);
  const [learnings, brain] = await Promise.all([
    getLearnings("sponsor-reel-prompt"),
    buildBrainContext(),
  ]);
  const system = injectBrainContext(buildEnhancedPrompt(buildSystemPrompt(quality, sponsorHandle), learnings), brain);

  const topCompetitorPosts = competitors
    .flatMap((c) => c.posts.slice(0, 5))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10);

  const sponsorTopPosts = (sponsor.posts || [])
    .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 5);

  const context = `SPONSOR BRAND (@${sponsorHandle}):
Top posts:
${sponsorTopPosts.map((p: any) => `"${p.caption?.slice(0, 150)}" - ${p.likes || 0} likes [${p.type || "post"}]`).join("\n")}

MY ACCOUNT (@${me.handle}): avg ${me.avgLikes} likes, ${me.avgComments} comments per post.
Engagement rate: ${me.engagementRate}%

TOP COMPETITOR POSTS (by likes):
${topCompetitorPosts.map((p) => `"${p.caption?.slice(0, 150)}" - ${p.likes} likes (@${p.ownerUsername}) [${p.type}]`).join("\n")}

MY RECENT POSTS:
${me.posts
  .sort((a, b) => b.likes - a.likes)
  .slice(0, 5)
  .map((p) => `[${p.type}] "${p.caption?.slice(0, 100)}" - ${p.likes} likes`)
  .join("\n")}

Generate 4-5 visually distinct AI reel concepts for a sponsor activation between @racquetsclubcommunity and @${sponsorHandle}. For each one, write a complete production prompt with all visual specs and natural sponsor brand integration, ready to paste into AI video tools.`;

  try {
    const result = await askClaude(system, context);
    const reportId = await saveReport("sponsor-reel-prompt", result);
    return NextResponse.json({ agent: "sponsor-reel-prompt", result, reportId, learningsUsed: learnings.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
