// script.js

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar background blur effect on scroll
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(10, 10, 10, 0.95)';
            nav.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
        } else {
            nav.style.background = 'rgba(10, 10, 10, 0.8)';
            nav.style.boxShadow = 'none';
        }
    });

    // Intersection Observer for scroll animations (fade in)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Apply animation starting state to elements
    const elementsToAnimate = document.querySelectorAll('.feature-card, .service-item, .tech-box');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // --- Advanced Calculator Logic ---
    const calcGrid = document.querySelector('.calc-grid');
    if (calcGrid) {
        const fmt = n => 'R ' + Math.round(n).toLocaleString('en-ZA');

        // Deliverables
        const deliverables = [
            { id: 'raw', tag: 'Base', label: 'Raw Point Cloud', add: 0.0 },
            { id: 'viewer', tag: '+10%', label: 'Web-based Viewer (TruView)', add: 0.1 },
            { id: 'cad', tag: '+50%', label: '2D CAD Drawings', add: 0.5 },
            { id: 'topo', tag: '+40%', label: 'Topographical Survey/Mesh', add: 0.4 },
            { id: 'bim', tag: 'LOD', label: '3D BIM Model', add: 0.0 } // Value calculated dynamically based on LOD
        ];
        let selectedDelivs = new Set(['raw']);
        const delivGrid = document.getElementById('calc-deliv-grid');
        
        deliverables.forEach(d => {
            const card = document.createElement('div');
            card.className = 'calc-deliv-card' + (selectedDelivs.has(d.id) ? ' selected' : '');
            card.dataset.id = d.id;
            card.innerHTML = `
                <div class="calc-deliv-tag">${d.tag}</div>
                <div class="calc-deliv-label">${d.label}</div>
                <div style="margin-top: 5px; font-size: 0.8rem; color: var(--text-muted);">${d.add > 0 ? '+' + (d.add*100) + '% Effort' : 'Included'}</div>
            `;
            card.addEventListener('click', () => {
                if (selectedDelivs.has(d.id)) {
                    if (selectedDelivs.size > 1) { // Prevent unselecting the last option
                        selectedDelivs.delete(d.id);
                        card.classList.remove('selected');
                    }
                } else {
                    selectedDelivs.add(d.id);
                    card.classList.add('selected');
                }
                
                // Toggle BIM level dropdown
                const bimRow = document.getElementById('bim-level-row');
                if(bimRow) {
                    bimRow.style.display = selectedDelivs.has('bim') ? 'block' : 'none';
                }
                
                recalc();
            });
            delivGrid.appendChild(card);
        });

        // Wizard Navigation Logic
        let currentStep = 1;
        const totalSteps = 5;
        const nextBtn = document.getElementById('wizard-next');
        const prevBtn = document.getElementById('wizard-prev');
        
        function updateWizardUI() {
            // Update panels
            document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
            const activePanel = document.getElementById('wizard-step-' + currentStep);
            if(activePanel) activePanel.classList.add('active');
            
            // Update progress indicators
            document.querySelectorAll('.wizard-step').forEach(step => {
                const s = parseInt(step.dataset.step);
                step.classList.remove('active', 'completed');
                if (s === currentStep) step.classList.add('active');
                if (s < currentStep) step.classList.add('completed');
            });
            
            // Update buttons
            if (prevBtn) prevBtn.style.display = (currentStep === 1) ? 'none' : 'inline-block';
            if (nextBtn) {
                nextBtn.style.display = 'inline-block';
                nextBtn.textContent = (currentStep === totalSteps) ? 'Get Instant Estimate' : 'Next Step';
            }

            // Update humanized status in the right panel
            const statusLabel = document.querySelector('.calc-readout-label');
            const totalDisplay = document.getElementById('calc-total-display');
            if (statusLabel && totalDisplay) {
                if (currentStep === 1) {
                    statusLabel.textContent = "Step 1 of 5";
                    totalDisplay.textContent = "Analyzing project scope & environment...";
                } else if (currentStep === 2) {
                    statusLabel.textContent = "Step 2 of 5";
                    totalDisplay.textContent = "Assessing site logistics & safety...";
                } else if (currentStep === 3) {
                    statusLabel.textContent = "Step 3 of 5";
                    totalDisplay.textContent = "Evaluating accuracy requirements...";
                } else if (currentStep === 4) {
                    statusLabel.textContent = "Step 4 of 5";
                    totalDisplay.textContent = "Configuring technical deliverables...";
                } else if (currentStep === 5) {
                    statusLabel.textContent = "Final Step";
                    totalDisplay.textContent = "Your estimation is ready";
                }
            }
        }

        if(nextBtn && prevBtn) {
            nextBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Form Validation on current step
                let isValid = true;
                const activePanel = document.getElementById('wizard-step-' + currentStep);
                const reqInputs = activePanel.querySelectorAll('input[required], select[required]');
                reqInputs.forEach(inp => {
                    if (!inp.value.trim()) {
                        isValid = false;
                        inp.style.border = '2px solid #ff4444';
                    } else {
                        inp.style.border = '';
                    }
                });
                
                if (!isValid) return; // Stop if validation fails

                if (currentStep < totalSteps) {
                    currentStep++;
                    updateWizardUI();
                } else if (currentStep === totalSteps) {
                    // Final submit logic
                    const email = document.getElementById('q-email').value;
                    const phone = document.getElementById('q-phone').value;
                    const project = document.getElementById('q-project').value;
                    
                    if (!email || !project) {
                        alert('Please provide your Project Name and Email Address to receive the quote.');
                        return;
                    }

                    nextBtn.textContent = 'Calculating Estimate...';
                    nextBtn.style.opacity = '0.7';
                    nextBtn.disabled = true;
                    
                    const totalDisplay = document.getElementById('calc-total-display');
                    if (totalDisplay) {
                        totalDisplay.textContent = "Sending to server...";
                    }

                    // Gather all inputs
                    const isUnknown = document.getElementById('q-area-unknown') ? document.getElementById('q-area-unknown').checked : false;
                    let finalArea = 0;
                    if (isUnknown) {
                        const bucketEl = document.getElementById('calc-area-bucket');
                        finalArea = bucketEl ? bucketEl.value : 0;
                    } else {
                        const areaEl = document.getElementById('calc-area');
                        finalArea = areaEl ? areaEl.value : 0;
                    }

                    const payload = {
                        email,
                        phone,
                        project,
                        company: document.getElementById('q-company')?.value || '',
                        contact: document.getElementById('q-contact')?.value || '',
                        contact_name: document.getElementById('q-contact')?.value || '',
                        area: finalArea,
                        areaUnknown: isUnknown,
                        areaBucket: isUnknown ? (document.getElementById('calc-area-bucket')?.value || finalArea) : undefined,
                        complexity: document.getElementById('calc-complexity') ? document.getElementById('calc-complexity').value : 'Commercial/Retail/Residential',
                        purpose: document.getElementById('q-purpose')?.value || '',
                        access: document.getElementById('q-access')?.value || '',
                        safety: document.getElementById('q-safety')?.value || '',
                        power: document.getElementById('q-power')?.value || '',
                        accuracy: document.getElementById('q-accuracy')?.value || 'Standard',
                        control: document.getElementById('q-control')?.value || '',
                        bimLevel: document.getElementById('q-bim-level')?.value || '300',
                        systems: document.getElementById('q-systems')?.value || '',
                        reference: document.getElementById('q-reference')?.value || '',
                        dateMob: document.getElementById('q-date-mob')?.value || '',
                        dateDue: document.getElementById('q-date-due')?.value || '',
                        deliverables: typeof selectedDelivs !== 'undefined' ? Array.from(selectedDelivs) : []
                    };

                    try {
                        const res = await fetch('/api/quote', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        
                        if(res.ok) {
                            const data = await res.json().catch(() => ({}));
                            if(totalDisplay) {
                                totalDisplay.textContent = data.estimate
                                    ? ('Indicative range: ' + data.estimate)
                                    : 'Estimate sent — check your inbox';
                                totalDisplay.style.color = '#00e5ff';
                            }
                            nextBtn.textContent = 'Waiting in your inbox';
                        } else {
                            alert('Failed to calculate. Please contact support.');
                            nextBtn.textContent = 'Get Instant Estimate';
                            nextBtn.disabled = false;
                            nextBtn.style.opacity = '1';
                        }
                    } catch(err) {
                        console.error(err);
                        alert('Error connecting to the pricing engine. Please try again or contact us.');
                        nextBtn.textContent = 'Get Instant Estimate';
                        nextBtn.disabled = false;
                        nextBtn.style.opacity = '1';
                    }
                }
            });
            
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (currentStep > 1) {
                    currentStep--;
                    updateWizardUI();
                }
            });
        }

        function recalc() {
            // Get Area
            const unknownToggle = document.getElementById('q-area-unknown');
            const isUnknown = unknownToggle ? unknownToggle.checked : false;
            let area = 0;
            let summaryLabel = "";
            if (isUnknown) {
                const bucketEl = document.getElementById('calc-area-bucket');
                area = parseFloat(bucketEl.value) || 0;
                summaryLabel = bucketEl.options[bucketEl.selectedIndex].text.split(' (')[0].trim();
            } else {
                area = parseFloat(document.getElementById('calc-area').value) || 0;
                summaryLabel = `${area} sqm`;
            }

            let chosenLabels = [];
            if (typeof selectedDelivs !== 'undefined') {
                if (selectedDelivs.has('raw')) chosenLabels.push('Raw Point Cloud');
                if (selectedDelivs.has('viewer')) chosenLabels.push('Web-based Viewer');
                if (selectedDelivs.has('cad')) chosenLabels.push('2D CAD Drawings');
                if (selectedDelivs.has('topo')) chosenLabels.push('Topographical Survey');
                if (selectedDelivs.has('bim')) {
                    const lodEl = document.getElementById('q-bim-level');
                    const lod = lodEl ? lodEl.value : '200';
                    chosenLabels.push(`3D BIM Model (LOD ${lod})`);
                }
            }

            // Update summary
            const summaryEl = document.getElementById('calc-mode-summary');
            if (summaryEl) summaryEl.textContent = `Size: ${summaryLabel} • ${chosenLabels.join(', ')}`;

            // Visual effect
            const scanline = document.getElementById('calc-scanline');
            if(scanline) {
                scanline.style.animation = 'none';
                void scanline.offsetWidth;
                scanline.style.animation = 'scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            }
        }

        // Wire inputs
        document.querySelectorAll('#scoping-form input, #scoping-form select').forEach(inp => {
            inp.addEventListener('input', recalc);
        });

        // Make date inputs open calendar on click
        document.querySelectorAll('input[type="date"]').forEach(inp => {
            inp.addEventListener('click', function() {
                if(this.showPicker) this.showPicker();
            });
        });

        const areaUnknown = document.getElementById('q-area-unknown');
        if(areaUnknown) {
            areaUnknown.addEventListener('change', function() {
                const areaInput = document.getElementById('calc-area');
                const areaBucket = document.getElementById('calc-area-bucket');
                if (this.checked) {
                    areaInput.style.display = 'none';
                    areaInput.removeAttribute('required');
                    areaBucket.style.display = 'block';
                    areaBucket.setAttribute('required', 'true');
                } else {
                    areaInput.style.display = 'block';
                    areaInput.setAttribute('required', 'true');
                    areaBucket.style.display = 'none';
                    areaBucket.removeAttribute('required');
                }
                recalc();
            });
        }

        

        // Initial calc
        recalc();
    }

    // --- Smart FAQ Chatbot Injection & Logic ---
    const chatWidgetHTML = `
        <div class="ai-chatbot-widget">
            <div class="ai-chat-window" id="ai-chat-window">
                <div class="ai-chat-header">
                    <h3><i class="ph ph-robot"></i> 3D Metrics Assistant</h3>
                    <button class="ai-close-btn" id="ai-close-btn"><i class="ph ph-x"></i></button>
                </div>
                <div class="ai-chat-messages" id="ai-chat-messages">
                    <div class="chat-bubble bot">
                        Hello! I'm the 3D Scan Metrics AI assistant. How can I help you today?
                    </div>
                    <div class="ai-quick-replies" id="ai-quick-replies">
                        <button class="ai-quick-reply-btn">How much does it cost?</button>
                        <button class="ai-quick-reply-btn">Where do you operate?</button>
                        <button class="ai-quick-reply-btn">What deliverables do you provide?</button>
                        <button class="ai-quick-reply-btn">How accurate are the scans?</button>
                    </div>
                </div>
                <div class="ai-chat-input-area">
                    <input type="text" id="ai-chat-input" class="ai-chat-input" placeholder="Type your question..." autocomplete="off">
                    <button id="ai-chat-send" class="ai-chat-send"><i class="ph ph-paper-plane-right" style="font-size: 1.2rem;"></i></button>
                </div>
            </div>
            <button class="ai-chat-btn" id="ai-chat-toggle"><i class="ph ph-chat-teardrop-dots"></i></button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatWidgetHTML);

    const chatWindow = document.getElementById('ai-chat-window');
    const chatToggleBtn = document.getElementById('ai-chat-toggle');
    const closeBtn = document.getElementById('ai-close-btn');
    const chatMessages = document.getElementById('ai-chat-messages');
    const chatInput = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    const quickRepliesContainer = document.getElementById('ai-quick-replies');

    // Toggle chat window
    chatToggleBtn.addEventListener('click', () => {
        chatWindow.classList.add('active');
        chatToggleBtn.style.transform = 'scale(0)';
    });
    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
        chatToggleBtn.style.transform = 'scale(1)';
    });

    // Handle Quick Replies
    document.querySelectorAll('.ai-quick-reply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.target.innerText;
            handleUserMessage(text);
            if(quickRepliesContainer) quickRepliesContainer.style.display = 'none'; // Hide after use
        });
    });

    // Send on click or enter
    sendBtn.addEventListener('click', () => {
        if(chatInput.value.trim()) handleUserMessage(chatInput.value);
    });
    chatInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter' && chatInput.value.trim()) {
            handleUserMessage(chatInput.value);
        }
    });

    function handleUserMessage(messageText) {
        // Add user message
        appendMessage(messageText, 'user');
        chatInput.value = '';
        if(quickRepliesContainer) quickRepliesContainer.style.display = 'none';

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'chat-bubble bot ai-typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        typingIndicator.id = 'typing-indicator';
        chatMessages.appendChild(typingIndicator);
        scrollToBottom();

        // Simulate network delay
        setTimeout(() => {
            document.getElementById('typing-indicator').remove();
            const response = generateBotResponse(messageText);
            appendMessage(response, 'bot');
        }, 1000);
    }

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-bubble ${sender}`;
        msgDiv.innerHTML = text; // allow HTML in bot responses
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function generateBotResponse(input) {
        const query = input.toLowerCase();
        
        if (query.includes('cost') || query.includes('price') || query.includes('how much') || query.includes('estimate')) {
            return "Our pricing starts at a base mobilization fee of R3,500, plus a per-square-meter rate based on complexity (R25 - R45/sqm). You can use the <a href='index.html#estimator' style='color:var(--primary-cyan);'>Cost Estimator on our homepage</a> to get an instant rough estimate!";
        }
        else if (query.includes('where') || query.includes('location') || query.includes('operate') || query.includes('city')) {
            return "We operate across South Africa! We have dedicated teams servicing Johannesburg, Cape Town, Durban, Pretoria, and Port Elizabeth.";
        }
        else if (query.includes('deliverable') || query.includes('format') || query.includes('file') || query.includes('get')) {
            return "We can deliver Raw Point Clouds (via our Cloud Viewer), 2D CAD Drawings, or full 3D BIM/Revit models depending on your project needs.";
        }
        else if (query.includes('accurate') || query.includes('accuracy') || query.includes('precision') || query.includes('tolerance')) {
            return "Our state-of-the-art laser scanners capture data with sub-millimeter tolerances, ensuring extreme precision for engineering and architectural applications.";
        }
        else if (query.includes('software') || query.includes('program') || query.includes('view') || query.includes('cad')) {
            return "You don't need any special software! We deliver point clouds via a highly intuitive, browser-based cloud platform where you can measure, crop, and share instantly.";
        }
        else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
            return "Hello there! Let me know if you have any questions about our 3D scanning services.";
        }
        else {
            return "That's a great question, but I'm still learning! For detailed inquiries, please send an email to <strong>info@3dscanmetrics.co.za</strong> or use our contact form.";
        }
    }


    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const navLinks = document.getElementById("nav-links");

    function setMenuOpen(open) {
        if (!navLinks || !mobileMenuToggle) return;
        navLinks.classList.toggle("active", open);
        document.body.classList.toggle("menu-open", open);
        const icon = mobileMenuToggle.querySelector("i");
        if (icon) {
            icon.classList.toggle("ph-list", !open);
            icon.classList.toggle("ph-x", open);
        }
        mobileMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.setAttribute("role", "button");
        mobileMenuToggle.setAttribute("aria-label", "Open menu");
        mobileMenuToggle.addEventListener("click", () => {
            setMenuOpen(!navLinks.classList.contains("active"));
        });
        navLinks.querySelectorAll(".dropdown > a").forEach((link) => {
            link.addEventListener("click", (e) => {
                if (window.innerWidth > 1024) return;
                e.preventDefault();
                const parent = link.parentElement;
                navLinks.querySelectorAll(".dropdown.open").forEach((el) => {
                    if (el !== parent) el.classList.remove("open");
                });
                parent.classList.toggle("open");
            });
        });
        navLinks.querySelectorAll(".dropdown-content a, li:not(.dropdown) > a").forEach((link) => {
            link.addEventListener("click", () => setMenuOpen(false));
        });
    }

