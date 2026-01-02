/**
 * Validation Scheduler - Automated validation scheduling and execution
 * Implements periodic validation runs, startup hooks, and maintenance mode
 */

class ValidationScheduler {
    constructor() {
        this.schedules = new Map();
        this.activeJobs = new Map();
        this.maintenanceMode = false;
        this.config = {
            maxConcurrentJobs: 3,
            defaultInterval: 24 * 60 * 60 * 1000, // 24 hours
            retryAttempts: 3,
            retryDelay: 5 * 60 * 1000, // 5 minutes
            healthCheckInterval: 60 * 60 * 1000, // 1 hour
            logRetentionDays: 30
        };
        this.logger = console;
        this.isRunning = false;
        this.healthCheckTimer = null;
        this.startupHooks = [];
        this.shutdownHooks = [];
    }

    /**
     * Initialize the scheduler
     */
    async initialize() {
        try {
            this.logger.info('Initializing validation scheduler...');
            
            // Load existing schedules
            await this.loadSchedules();
            
            // Set up startup hooks
            await this.executeStartupHooks();
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            this.isRunning = true;
            this.logger.info('Validation scheduler initialized successfully');
            
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to initialize scheduler:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Schedule a validation job
     */
    scheduleValidation(name, config) {
        try {
            const schedule = {
                name,
                interval: config.interval || this.config.defaultInterval,
                validator: config.validator,
                options: config.options || {},
                enabled: config.enabled !== false,
                lastRun: null,
                nextRun: Date.now() + (config.delay || 0),
                retryCount: 0,
                maxRetries: config.maxRetries || this.config.retryAttempts,
                priority: config.priority || 'normal',
                createdAt: Date.now()
            };

            this.schedules.set(name, schedule);
            this.logger.info(`Scheduled validation job: ${name}`);
            
            // Start the job if scheduler is running
            if (this.isRunning) {
                this.startScheduledJob(name);
            }
            
            return { success: true, schedule };
        } catch (error) {
            this.logger.error(`Failed to schedule validation ${name}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Start a scheduled job
     */
    startScheduledJob(name) {
        const schedule = this.schedules.get(name);
        if (!schedule || !schedule.enabled) {
            return;
        }

        const timeUntilNext = schedule.nextRun - Date.now();
        const delay = Math.max(0, timeUntilNext);

        const timerId = setTimeout(async () => {
            await this.executeScheduledJob(name);
        }, delay);

        this.activeJobs.set(name, {
            timerId,
            schedule,
            startedAt: Date.now()
        });

        this.logger.info(`Started scheduled job: ${name}, next run in ${Math.round(delay / 1000)}s`);
    }

    /**
     * Execute a scheduled validation job
     */
    async executeScheduledJob(name) {
        const schedule = this.schedules.get(name);
        if (!schedule) {
            return;
        }

        // Check if we're in maintenance mode
        if (this.maintenanceMode && schedule.priority !== 'critical') {
            this.logger.info(`Skipping job ${name} due to maintenance mode`);
            this.rescheduleJob(name);
            return;
        }

        // Check concurrent job limit
        const runningJobs = Array.from(this.activeJobs.values())
            .filter(job => job.executing);
        
        if (runningJobs.length >= this.config.maxConcurrentJobs) {
            this.logger.warn(`Job limit reached, delaying ${name}`);
            this.rescheduleJob(name, 5 * 60 * 1000); // Delay 5 minutes
            return;
        }

        try {
            this.logger.info(`Executing validation job: ${name}`);
            
            // Mark as executing
            const activeJob = this.activeJobs.get(name);
            if (activeJob) {
                activeJob.executing = true;
                activeJob.executionStarted = Date.now();
            }

            // Execute the validation
            const result = await this.runValidation(schedule);
            
            // Update schedule
            schedule.lastRun = Date.now();
            schedule.retryCount = 0;
            schedule.nextRun = Date.now() + schedule.interval;
            
            this.logger.info(`Validation job ${name} completed successfully`);
            
            // Schedule next run
            this.rescheduleJob(name);
            
        } catch (error) {
            this.logger.error(`Validation job ${name} failed:`, error);
            
            // Handle retry logic
            schedule.retryCount++;
            if (schedule.retryCount < schedule.maxRetries) {
                const retryDelay = this.config.retryDelay * schedule.retryCount;
                this.logger.info(`Retrying job ${name} in ${retryDelay / 1000}s (attempt ${schedule.retryCount})`);
                this.rescheduleJob(name, retryDelay);
            } else {
                this.logger.error(`Job ${name} failed after ${schedule.maxRetries} attempts`);
                schedule.retryCount = 0;
                schedule.nextRun = Date.now() + schedule.interval;
                this.rescheduleJob(name);
            }
        } finally {
            // Mark as not executing
            const activeJob = this.activeJobs.get(name);
            if (activeJob) {
                activeJob.executing = false;
                activeJob.executionCompleted = Date.now();
            }
        }
    }

    /**
     * Run the actual validation
     */
    async runValidation(schedule) {
        const { validator, options } = schedule;
        
        if (typeof validator === 'function') {
            return await validator(options);
        } else if (typeof validator === 'string') {
            // Load validator module
            const validatorModule = await this.loadValidator(validator);
            return await validatorModule.validate(options);
        } else {
            throw new Error('Invalid validator configuration');
        }
    }

    /**
     * Load a validator module
     */
    async loadValidator(validatorName) {
        try {
            // Try to load from validation directory
            const validatorPath = `./validation/${validatorName}.js`;
            return require(validatorPath);
        } catch (error) {
            // Try to load as npm module
            return require(validatorName);
        }
    }

    /**
     * Reschedule a job
     */
    rescheduleJob(name, customDelay = null) {
        const schedule = this.schedules.get(name);
        if (!schedule || !schedule.enabled) {
            return;
        }

        // Clear existing timer
        const activeJob = this.activeJobs.get(name);
        if (activeJob && activeJob.timerId) {
            clearTimeout(activeJob.timerId);
        }

        // Calculate next run time
        const delay = customDelay || (schedule.nextRun - Date.now());
        const nextDelay = Math.max(1000, delay); // Minimum 1 second

        // Schedule next run
        const timerId = setTimeout(async () => {
            await this.executeScheduledJob(name);
        }, nextDelay);

        this.activeJobs.set(name, {
            timerId,
            schedule,
            startedAt: Date.now()
        });
    }

    /**
     * Run periodic validation (manual trigger)
     */
    async runPeriodicValidation() {
        if (this.maintenanceMode) {
            this.logger.info('Skipping periodic validation - maintenance mode active');
            return { success: false, reason: 'maintenance_mode' };
        }

        try {
            this.logger.info('Starting periodic validation run...');
            
            const results = [];
            const enabledSchedules = Array.from(this.schedules.values())
                .filter(schedule => schedule.enabled);

            for (const schedule of enabledSchedules) {
                try {
                    const result = await this.runValidation(schedule);
                    results.push({
                        name: schedule.name,
                        success: true,
                        result
                    });
                } catch (error) {
                    results.push({
                        name: schedule.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            this.logger.info(`Periodic validation completed. ${results.length} jobs processed`);
            return { success: true, results };
            
        } catch (error) {
            this.logger.error('Periodic validation failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enable maintenance mode
     */
    enableMaintenanceMode(reason = 'Manual activation') {
        this.maintenanceMode = true;
        this.logger.info(`Maintenance mode enabled: ${reason}`);
        
        // Pause non-critical jobs
        for (const [name, job] of this.activeJobs) {
            if (job.schedule.priority !== 'critical') {
                clearTimeout(job.timerId);
                this.logger.info(`Paused job: ${name}`);
            }
        }
        
        return { success: true, reason };
    }

    /**
     * Disable maintenance mode
     */
    disableMaintenanceMode() {
        this.maintenanceMode = false;
        this.logger.info('Maintenance mode disabled');
        
        // Resume paused jobs
        for (const [name, schedule] of this.schedules) {
            if (schedule.enabled && !this.activeJobs.has(name)) {
                this.startScheduledJob(name);
            }
        }
        
        return { success: true };
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        const activeJobsInfo = Array.from(this.activeJobs.entries()).map(([name, job]) => ({
            name,
            executing: job.executing || false,
            nextRun: job.schedule.nextRun,
            lastRun: job.schedule.lastRun,
            retryCount: job.schedule.retryCount
        }));

        return {
            isRunning: this.isRunning,
            maintenanceMode: this.maintenanceMode,
            totalSchedules: this.schedules.size,
            activeJobs: activeJobsInfo.length,
            jobs: activeJobsInfo
        };
    }

    /**
     * Add startup hook
     */
    addStartupHook(name, hook) {
        this.startupHooks.push({ name, hook });
        this.logger.info(`Added startup hook: ${name}`);
    }

    /**
     * Execute startup hooks
     */
    async executeStartupHooks() {
        this.logger.info('Executing startup hooks...');
        
        for (const { name, hook } of this.startupHooks) {
            try {
                await hook();
                this.logger.info(`Startup hook completed: ${name}`);
            } catch (error) {
                this.logger.error(`Startup hook failed: ${name}`, error);
            }
        }
    }

    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
        
        this.logger.info('Health monitoring started');
    }

    /**
     * Perform health check
     */
    performHealthCheck() {
        try {
            const now = Date.now();
            let issuesFound = 0;

            // Check for stuck jobs
            for (const [name, job] of this.activeJobs) {
                if (job.executing && job.executionStarted) {
                    const executionTime = now - job.executionStarted;
                    const maxExecutionTime = 30 * 60 * 1000; // 30 minutes
                    
                    if (executionTime > maxExecutionTime) {
                        this.logger.warn(`Job ${name} appears stuck (running for ${Math.round(executionTime / 1000)}s)`);
                        issuesFound++;
                    }
                }
            }

            // Check for overdue jobs
            for (const [name, schedule] of this.schedules) {
                if (schedule.enabled && schedule.nextRun < now - 60000) { // 1 minute grace period
                    this.logger.warn(`Job ${name} is overdue`);
                    issuesFound++;
                }
            }

            if (issuesFound === 0) {
                this.logger.debug('Health check passed');
            } else {
                this.logger.warn(`Health check found ${issuesFound} issues`);
            }
            
        } catch (error) {
            this.logger.error('Health check failed:', error);
        }
    }

    /**
     * Load schedules from storage
     */
    async loadSchedules() {
        // Implementation would load from persistent storage
        // For now, just log that we're loading
        this.logger.info('Loading schedules from storage...');
    }

    /**
     * Save schedules to storage
     */
    async saveSchedules() {
        // Implementation would save to persistent storage
        this.logger.info('Saving schedules to storage...');
    }

    /**
     * Shutdown the scheduler
     */
    async shutdown() {
        this.logger.info('Shutting down validation scheduler...');
        
        this.isRunning = false;
        
        // Clear all timers
        for (const [name, job] of this.activeJobs) {
            if (job.timerId) {
                clearTimeout(job.timerId);
            }
        }
        
        // Clear health check timer
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        // Execute shutdown hooks
        for (const { name, hook } of this.shutdownHooks) {
            try {
                await hook();
                this.logger.info(`Shutdown hook completed: ${name}`);
            } catch (error) {
                this.logger.error(`Shutdown hook failed: ${name}`, error);
            }
        }
        
        // Save schedules
        await this.saveSchedules();
        
        this.logger.info('Validation scheduler shutdown complete');
    }
}

module.exports = ValidationScheduler;