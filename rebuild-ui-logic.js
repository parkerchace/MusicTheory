const fs = require('fs');

let html = fs.readFileSync('modular-music-theory.html', 'utf8');

const masterCSS = `                /* Tree View (Upside Down Tree) */
                .tree-view { display:flex; flex-direction:column; gap:40px; overflow:auto; max-height:60vh; padding:20px; align-items:center; }
                .tree-family-wrapper { display:flex; flex-direction:column; align-items:center; width:100%; margin-bottom: 20px;}
                .tree-family-root { background:var(--bg-panel); border:2px solid var(--accent-primary); padding:10px 20px; border-radius:8px; font-weight:bold; font-size:1.2rem; color:var(--accent-primary); position:relative; z-index:2; text-align:center; min-width:200px;}
                .tree-family-root::after { content:''; position:absolute; bottom:-20px; left:50%; width:2px; height:20px; background:var(--border-light); transform:translateX(-50%); z-index:1;}
                .tree-categories-row { display:flex; gap:30px; justify-content:center; position:relative; padding-top:20px; border-top:2px solid var(--border-light); margin-top:20px; flex-wrap:wrap;}
                .tree-categories-row::before { content:''; position:absolute; top:-2px; left:-10px; right:-10px; height:4px; background:var(--bg-app); z-index:0; } 
                .tree-category-col { display:flex; flex-direction:column; align-items:center; position:relative; padding:0 15px; min-width:320px; }
                .tree-category-col::before { content:''; position:absolute; top:-20px; left:50%; width:2px; height:20px; background:var(--border-light); transform:translateX(-50%); }
                .tree-category-node { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); padding:6px 14px; border-radius:20px; font-size:0.95rem; font-weight:bold; margin-bottom:15px; position:relative; text-align:center; width:100%;}
                .tree-category-node::after { content:''; position:absolute; bottom:-15px; left:50%; width:2px; height:15px; background:rgba(255,255,255,0.1); transform:translateX(-50%); }
                .tree-sub-col { display:flex; flex-direction:column; align-items:center; min-width:300px; flex:1; max-width:800px; padding:0 10px; border-top:1px dashed rgba(255,255,255,0.1); margin-top:10px; padding-top:15px; position:relative; }
                .tree-sub-node { font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; background:#111; padding:2px 8px; border-radius:4px; border:1px solid rgba(255,255,255,0.05);}

                /* Column View */
                .special-view { display:flex; gap:16px; overflow-x:auto; overflow-y:hidden; padding:10px 10px 20px 10px; height:60vh; align-items:flex-start; }
                .special-column { display:flex; flex-direction:column; width:300px; flex-shrink:0; background:var(--bg-panel); border:1px solid var(--border-light); border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.2); height:100%; }
                .special-header { background:var(--bg-panel); color:var(--accent-primary); padding:12px; text-align:center; font-family:var(--font-tech); font-weight:bold; font-size:1.1rem; text-transform:uppercase; border-bottom:2px solid var(--border-light); display:flex; align-items:center; justify-content:center; gap:8px; }
                .special-header-icon { font-size:1.4rem; }
                .special-content { padding:10px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:12px; }
                .special-cat-block { border:1px dashed var(--border-light); padding:8px; border-radius:4px; background:rgba(255,255,255,0.02); }
                .special-cat-title { color:var(--accent-primary); font-family:var(--font-tech); font-size:0.85rem; font-weight:bold; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; text-transform:uppercase; }
                .special-sub-title { color:var(--text-muted); font-family:var(--font-tech); font-size:0.75rem; margin-bottom:6px; font-weight:bold; cursor:pointer; padding:2px; background:rgba(255,255,255,0.03); border-radius:3px; }
                .special-sub-title:hover { background:rgba(255,255,255,0.1); }
                .special-item { background:var(--bg-app); border:1px solid var(--border-light); color:var(--text-main); padding:6px 10px; border-radius:3px; font-family:var(--font-tech); font-size:0.8rem; cursor:pointer; transition:all 0.15s; margin-bottom:4px; display:flex; flex-direction:column; }
                .special-item:hover { background:var(--accent-secondary); color:#000; font-weight:bold; transform:translateY(-2px); box-shadow:0 4px 0 var(--accent-primary); }
                .special-item.highlight-mode { background:var(--accent-primary); color:#000; font-weight:bold; border-color:var(--accent-primary); }
                .special-item .scale-tags { color:var(--text-muted); }
                .special-item:hover .scale-tags { color:rgba(0,0,0,0.6); }
                
                .collapsed-content { display:none !important; }
                .tree-category-items-wrapper { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; align-items:flex-start; width:100%; padding-top:15px; position:relative; }
                .special-cat-items-wrapper { display:flex; flex-direction:column; gap:8px; margin-top:4px; }
                
                /* Search & Pedagogical Indicators */
                .taxonomy-view-wrapper { display:flex; flex-direction:column; width:100%; height:100%; }
                .taxonomy-search-box { width: 100%; padding: 10px 20px; background: #000; border: 1px solid var(--accent-primary); border-radius: 30px; color: #fff; outline:none; font-family:var(--font-tech); text-align:center; }
`;

// Extract old CSS bounds (from /* Organic Branching Tree View */ to right before document.head.appendChild(s);)
const cssPattern = /\/\*\s*Organic Branching Tree View\s*\*\/[\s\S]*?\.special-cat-items-wrapper[^}]*\}\s*/;
html = html.replace(cssPattern, masterCSS + '\\n                ');

// Extract toggles and fix JS logic for clicks:
const innerBuilder = `                    if (currentViewMode === 'tree') {
                        const totalInCat = Object.values(layoutTree[famName][catName]).reduce((sum, subBucket) => {
                            return sum + Object.values(subBucket || {}).reduce((inner, ids) => inner + ids.length, 0);
                        }, 0);
                        const catNode = createEl('div', 'tree-category-node', catName + ' (' + totalInCat + ') ▾');
                        catNode.style.cursor = 'pointer';
                        catNode.onclick = () => { 
                            const isCol = catContentWrapper.classList.toggle('collapsed-content'); 
                            catNode.innerHTML = isCol ? catName + ' (' + totalInCat + ') ▾' : catName + ' (' + totalInCat + ') ▴';
                            if(!isCol) setTimeout(() => catNode.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                        };
                        catDiv.appendChild(catNode);
                    } else {
                        const totalInCat = Object.values(layoutTree[famName][catName]).reduce((sum, subBucket) => {
                            return sum + Object.values(subBucket || {}).reduce((inner, ids) => inner + ids.length, 0);
                        }, 0);
                        const catTitle = createEl('div', 'special-cat-title', catName + ' (' + totalInCat + ') ▾');
                        catTitle.style.cursor = 'pointer';
                        catTitle.onclick = () => {
                            const isCol = catContentWrapper.classList.toggle('collapsed-content');
                            catTitle.innerHTML = isCol ? catName + ' (' + totalInCat + ') ▾' : catName + ' (' + totalInCat + ') ▴';
                            if(!isCol) setTimeout(() => catTitle.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                        };
                        catDiv.appendChild(catTitle); 
                    }

                    sortKeysByComplexity(layoutTree[famName][catName]).forEach(subName => {
                        const subDiv = createEl('div', currentViewMode === 'tree' ? 'tree-sub-col' : 'special-sub-block');
                        const subContentWrapper = createEl('div', 'sub-content-wrapper');
                        subContentWrapper.classList.add('collapsed-content');

                        const totalInSub = Object.values(layoutTree[famName][catName][subName] || {}).reduce((sum, ids) => sum + ids.length, 0);

                        if (currentViewMode === 'tree') {
                            const subNode = createEl('div', 'tree-sub-node', subName + ' (' + totalInSub + ') ▾');
                            subNode.style.cursor = 'pointer';
                            subNode.onclick = (e) => {
                                e.stopPropagation();
                                const isCol = subContentWrapper.classList.toggle('collapsed-content');
                                subNode.innerHTML = isCol ? subName + ' (' + totalInSub + ') ▾' : subName + ' (' + totalInSub + ') ▴';
                                if(!isCol) setTimeout(() => subNode.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                            };
                            subDiv.appendChild(subNode);
                        } else {
                            if (subName) {
                                const subTitle = createEl('div', 'special-sub-title', subName + ' (' + totalInSub + ') ▾');
                                subTitle.style.cursor = 'pointer';
                                subTitle.onclick = (e) => {
                                    e.stopPropagation();
                                    const isCol = subContentWrapper.classList.toggle('collapsed-content');
                                    subTitle.innerHTML = isCol ? subName + ' (' + totalInSub + ') ▾' : subName + ' (' + totalInSub + ') ▴';
                                    if(!isCol) setTimeout(() => subTitle.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                                };
                                subDiv.appendChild(subTitle);
                            } else {
                                subContentWrapper.classList.remove('collapsed-content');
                            }
                        }

                        // Sub-subcategory level
                        const subSubKeys = sortKeysByComplexity(layoutTree[famName][catName][subName] || {});
                        subSubKeys.forEach(ssName => {
                            const ssBox = createEl('div', 'scale-items-container' + (currentViewMode === 'special' ? '-col' : ''));
                            if (ssName) {
                                const ssTitle = createEl('div', 'sub-sub-title', ssName);
                                subContentWrapper.appendChild(ssTitle);
                            }
                            const items = layoutTree[famName][catName][subName][ssName];
                            items.forEach(s => {
                                const taxes = byScale[s.id] || [];
                                const tax = taxes[0] || {};
                                const tags = tax.tags ? tax.tags.slice(0,3).join(', ') : '';
                                const node = createEl('div', (currentViewMode === 'tree' ? 'scale-item-node' : 'special-item'), s.name + ' <span class="scale-tags">' + tags + '</span>');
                                ssBox.appendChild(node);
                            });
                            subContentWrapper.appendChild(ssBox);
                        });
                        });
                        subDiv.appendChild(subContentWrapper);
                        catContentWrapper.appendChild(subDiv);
                    });
`;

// Regex to replace the inner builder block exactly where it resides
const builderPattern = /if\s*\(currentViewMode === 'tree'\)\s*\{\s*const catNode = createEl\('div', 'tree-category-node'[\s\S]*?subDiv\.appendChild\(subTitle\);\s*\}\s*\}/;

html = html.replace(builderPattern, innerBuilder);

if(!html.includes('scale-items-container-col')) {
    console.error("FAILED TO REPLACE BUILDER BLOCK");
}

fs.writeFileSync('modular-music-theory.html', html);
console.log("Full CSS and JS block dynamically overridden with perfect styling.");
