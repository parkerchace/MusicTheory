/**
 * offline-thesaurus.js
 * 
 * Maps thousands of descriptive words to core Musical Archetypes.
 * The SemanticContourEngine unpacks this at runtime for instant O(1) lookup.
 */

(function() {
    // Compressed dictionary: archetype_name -> "word1,word2,word3"
    const compressedThesaurus = {
        // TENSION - DARK (Minor, Phrygian, Diminished vibes)
        dark: "dark,shadow,shadowy,black,dim,gloomy,murky,dusk,twilight,night,midnight,obscure,somber,grim,bleak,dismal,desolate,mournful,sad,depressed,sorrow,grief,tragic,melancholy,doom,abyss,void,cavern,cave,underworld,depths,creepy,eerie,sinister,menacing,ominous,evil,wicked,corrupt,tainted,heavy,weighted,burial,grave,cold,frozen,chill,icy,winter,storm,thunder,lightning,rough,harsh,sharp,blade,blood,pain,suffering,loss,end,finish,death,kill,murder,ghost,specter,phantom,haunt,horror,terror,fright,scared,afraid,fear,anxiety,stress,panic,chaos,ruin,wreck,broken,lost,hidden,secret,mystery,mystic,occult,forbidden,ancient,old,dust,bones,skeleton,skull,poison,toxic,venom,snake,spider,web,trap,stuck,jail,prison,cage,locked,keyless,blind,darkness",
        
        // TENSION - BRIGHT (Major, Lydian, Mixolydian vibes)
        bright: "bright,light,sun,sunny,sunlight,day,dawn,morning,shine,shining,radiant,glowing,glow,luminous,brilliant,vivid,colorful,clear,crystal,lucid,happy,joy,joyful,glad,cheerful,delight,delightful,triumph,triumphant,victorious,glory,glorious,soar,soaring,majestic,grand,splendid,gold,golden,silver,white,pure,clean,fresh,new,birth,life,alive,growth,bloom,flower,garden,forest,green,blue,sky,cloud,air,wind,flight,wings,angel,heaven,paradise,wonder,magic,sparkle,glitter,star,comet,galaxy,space,future,hope,promise,dream,vision,ideal,perfect,holy,divine,sacred,blessed,gift,love,heart,warm,summer,spring,beach,ocean,wave,spark,fire,flame,burn,hot,energy,power,strong,brave,hero,knight,king,queen,crown,throne,palace,castle,celebrate,party,dance,sing,laugh,smile,friend,kind,sweet,soft,gentle,smooth,easy,free,liberty,freedom",
        
        // TENSION - PEACEFUL (Consonant, Static, Lydian vibes)
        peaceful: "peace,peaceful,calm,tranquil,serene,quiet,still,silent,hush,gentle,soft,smooth,mild,mellow,rest,relax,sleep,dream,dreamy,float,floating,breeze,whisper,tender,sweet,pure,innocent,sacred,holy,divine,grace,graceful,meadow,lake,pond,stream,river,mountain,valley,nature,earth,soil,root,tree,leaf,grass,moss,stone,rock,sand,desert,wide,vast,infinite,eternal,slow,steady,constant,true,loyal,faithful,safe,secure,home,bed,blanket,warmth,hug,kiss,breath,breathe,air,mist,fog,cloud,haze,lazy,softness,velvet,silk,smoothness",
        
        // MOTION - RISE (Ascending, Building tension)
        rise: "rise,rising,ascend,climb,build,grow,increase,expand,stretch,reach,pull,up,higher,top,peak,summit,mount,surge,swell,wave,tide,wind,lift,elevate,soar,fly,launch,start,begin,open,first,early,young,child,seed,sprout,ignite,spark,heat,boil,pressure,fast,faster,rush,hurry,accelerate,zoom,dash,run,jump,leap,hop,bounce,active,sharp,high,loud,strong,bigger,more,intensify",
        
        // MOTION - FALL (Descending, Releasing tension)
        fall: "fall,falling,descend,sink,drop,lower,down,bottom,base,ground,floor,end,finish,last,late,old,death,stop,close,die,fade,decay,wilt,dry,dust,ash,cold,cool,freeze,slow,slower,stop,halt,pause,break,rest,sleep,lay,sit,heavy,sag,droop,spill,melt,soft,low,quiet,weak,less,smaller,decrease,diminish,contract,shrink",
        
        // MOTION - JUMP (Disjunct, Large intervals)
        jump: "jump,leap,hop,bounce,spring,skip,snap,pop,crack,burst,explosion,kaboom,bang,boom,sudden,surprise,shock,jolt,twitch,spasm,erratic,wild,crazy,insane,mad,angry,shout,scream,yell,hit,strike,kick,punch,break,shatter,jagged,sharp,pointy,angle,corner,zigzag,unpredictable,random,noise,glitch,error,wrong,strange,weird,odd,freak,alien,other,outer,beyond,far,distant,away,go,leave,quit,run",
        
        // MOTION - WANDER (Conjunct, Chromatic/Parallel vibes)
        wander: "wander,stroll,walk,meander,drift,flow,slide,glide,crawl,creep,snake,wind,twist,turn,curve,circle,loop,spin,whirl,dance,play,fun,game,toy,childish,silly,happy,free,loose,relaxed,vague,fuzzy,blur,mist,haze,smoke,spirit,ghost,soul,memory,past,lost,confused,dizzy,dream,trippy,psychedelic,colorful,fluid,liquid,water,rain,ocean,tide,current,stream",
        
        // DENSITY - FRANTIC (Fast, Rhythmic, Chromatic)
        frantic: "frantic,crazy,wild,mad,manic,panic,hurry,rush,fast,quick,rapid,speed,zoom,dash,sprint,heartbeat,pulse,beat,drum,noise,loud,clatter,bang,crash,storm,wind,fire,chaos,messy,busy,crowded,tight,sharp,sting,bite,burn,itch,scratch,anxious,nervous,scared,afraid,running,chase,hunt,prey,beast,monster,machine,engine,metal,electric,zap,bolt,power,voltage",
        
        // DENSITY - SPACIOUS (Slow, Ambient, Modal)
        spacious: "space,spacious,wide,vast,empty,open,infinite,endless,eternal,sky,universe,stars,galaxy,void,abyss,deep,ocean,desert,silent,quiet,still,calm,peace,rest,sleep,long,slow,steady,heavy,large,huge,giant,mountain,hill,field,meadow,air,breath,light,pure,clean,fresh,clear,glass,mirror,reflection"
    };

    // UNPACKING LOGIC
    const wordMap = new Map();
    for (const [archetype, words] of Object.entries(compressedThesaurus)) {
        words.split(',').forEach(word => {
            wordMap.set(word.trim().toLowerCase(), archetype);
        });
    }

    // EXPOSE TO GLOBAL
    window.OfflineThesaurus = {
        lookup: function(word) {
            if (!word) return null;
            const w = word.toLowerCase().trim();
            
            // 1. Direct Hit
            if (wordMap.has(w)) return wordMap.get(w);

            // 2. Simple Suffix Stripping (Stemming)
            const suffixes = ['ing', 'ed', 'ly', 's', 'y', 'ness', 'ment', 'ful'];
            for (let s of suffixes) {
                if (w.endsWith(s)) {
                    const root = w.slice(0, -s.length);
                    if (wordMap.has(root)) return wordMap.get(root);
                    if (root.endsWith(root[root.length-1])) { // handles "running" -> "run"
                        const doubleRoot = root.slice(0, -1);
                        if (wordMap.has(doubleRoot)) return wordMap.get(doubleRoot);
                    }
                }
            }
            return null;
        },
        size: wordMap.size
    };
    
    console.log(`📚 Offline Thesaurus initialized with ${window.OfflineThesaurus.size} core keywords.`);
})();
