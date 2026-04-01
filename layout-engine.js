/**
 * @module LayoutEngine
 * @description Handles interactive workspace resizing, module draggability, and layout persistence.
 */

class LayoutEngine {
    constructor() {
        this.workspace = document.querySelector('.workspace');
        this.splitterLeft = document.getElementById('splitter-left');
        this.splitterRight = document.getElementById('splitter-right');
        
        this.state = {
            isResizingLeft: false,
            isResizingRight: false,
            leftWidth: localStorage.getItem('layout-left-width') || '0.85fr',
            rightWidth: localStorage.getItem('layout-right-width') || '0.75fr'
        };

        this.init();
    }

    init() {
        if (!this.workspace) return;

        // Apply saved state
        this.applyLayout();

        // Event Listeners for Splitters
        if (this.splitterLeft) {
            this.splitterLeft.addEventListener('mousedown', (e) => {
                this.state.isResizingLeft = true;
                document.body.style.cursor = 'col-resize';
                document.body.classList.add('resizing');
            });
        }

        if (this.splitterRight) {
            this.splitterRight.addEventListener('mousedown', (e) => {
                this.state.isResizingRight = true;
                document.body.style.cursor = 'col-resize';
                document.body.classList.add('resizing');
            });
        }

        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());

        // Module Draggability (Simple version: click-to-pick, click-to-drop)
        this.initModuleDraggability();
    }

    applyLayout() {
        // We use a CSS Variable approach for the grid columns
        this.workspace.style.gridTemplateColumns = `${this.state.leftWidth} 6px 1fr 6px ${this.state.rightWidth}`;
    }

    handleMouseMove(e) {
        if (!this.state.isResizingLeft && !this.state.isResizingRight) return;

        const workspaceRect = this.workspace.getBoundingClientRect();
        
        if (this.state.isResizingLeft) {
            let newWidth = e.clientX - workspaceRect.left;
            // Constraints
            newWidth = Math.max(200, Math.min(newWidth, workspaceRect.width * 0.4));
            this.state.leftWidth = `${newWidth}px`;
        } else if (this.state.isResizingRight) {
            let newWidth = workspaceRect.right - e.clientX;
            // Constraints
            newWidth = Math.max(200, Math.min(newWidth, workspaceRect.width * 0.4));
            this.state.rightWidth = `${newWidth}px`;
        }

        this.applyLayout();
    }

    handleMouseUp() {
        if (this.state.isResizingLeft || this.state.isResizingRight) {
            localStorage.setItem('layout-left-width', this.state.leftWidth);
            localStorage.setItem('layout-right-width', this.state.rightWidth);
        }
        
        this.state.isResizingLeft = false;
        this.state.isResizingRight = false;
        document.body.style.cursor = '';
        document.body.classList.remove('resizing');
    }

    initModuleDraggability() {
        const headers = document.querySelectorAll('.module-header');
        headers.forEach(header => {
            header.style.cursor = 'grab';
            header.setAttribute('draggable', 'true');

            header.addEventListener('dragstart', (e) => {
                const module = header.closest('.studio-module');
                if (!module) return;
                module.classList.add('is-dragging');
                e.dataTransfer.setData('text/plain', ''); // Required for Firefox
                window.__draggingModule = module;
            });

            header.addEventListener('dragend', () => {
                const module = header.closest('.studio-module');
                if (module) module.classList.remove('is-dragging');
                window.__draggingModule = null;
            });
        });

        const columns = document.querySelectorAll('.workspace-column');
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = window.__draggingModule;
                if (!dragging) return;

                const afterElement = this.getDragAfterElement(column, e.clientY);
                if (afterElement == null) {
                    column.appendChild(dragging);
                } else {
                    column.insertBefore(dragging, afterElement);
                }
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.studio-module:not(.is-dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    window.layoutEngine = new LayoutEngine();
});
