const STORAGE_KEY = "clubsphere_sqlite_v2";

let SQL = null;
let db = null;

let currentUser = null;
let toastTimer = null;

function persist() {

    if (!db) return
    try {
        const data = db.export();
        let binary = "";
        for (
            let i = 0;
            i < data.length;
            i += 0x8000
        ) {
            binary += String.fromCharCode(
                ...data.subarray(
                    i,
                    i + 0x8000
                )
            );
        }
        localStorage.setItem(
            STORAGE_KEY,
            btoa(binary)
        );

    } catch (error) {
        console.error(
            "Database save error:",
            error
        );
    }
}

function loadSavedDatabase() {
    try {
        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );
        if (!saved) {
            return null;
        }
        const binary =
            atob(saved);
        const data =
            new Uint8Array(
                binary.length
            );
        for (
            let i = 0;
            i < binary.length;
            i++
        ) {
            data[i] =
                binary.charCodeAt(i);
        }
        return data;
    } catch (error) {
        console.error(
            "Database load error:",
            error
        );
        return null;
    }
}


/* SQL HELPERS */
function exec(sql, params = []) {
    db.run(
        sql,
        params
    );
    if (
        !/^\s*(PRAGMA|SELECT)/i.test(
            sql
        )
    ) {
        persist();
    }
}

function query(
    sql,
    params = []
) {
    const stmt =
        db.prepare(sql);
    try {
        stmt.bind(params);
        const cols =
            stmt.getColumnNames();
        const rows = [];
        while (
            stmt.step()
        ) {

            rows.push(
                stmt.get()
            );
        }
        return {
            cols,
            rows
        };
    } finally {

        stmt.free();
    }
}
function scalar(
    sql,
    params = []
) {
    const result =
        query(
            sql,
            params
        );
    if (
        result.rows.length &&
        result.rows[0][0] != null
    ) {
        return result.rows[0][0];
    }
    return 0;
}


/* Error Handling */

function friendly(error) {

    const message =
        String(
            error?.message ||
            error
        );
    if (
        message.includes(
            "UNIQUE"
        )
    ) {
        return "This value already exists.";
    }
    if (
        message.includes(
            "FOREIGN KEY"
        )
    ) {
        return "This record is connected to another record.";
    }
    if (
        message.includes(
            "NOT NULL"
        )
    ) {

        return "Please fill all required fields.";
    }
    if (
        message.includes(
            "CHECK"
        )
    ) {
        return "Please enter a valid value.";
    }
    return message;
}


function toast(
    message,
    type = "ok"
) {
    const element =
        document.getElementById("toast");
    element.textContent = message;
    element.className = "show " + type;
    clearTimeout(
        toastTimer
    );
    toastTimer =
        setTimeout(
            () => {
                element.className =
                    "";
            },
            3200
        );
}

function showError(error) {
    toast(
        friendly(error),
        "error"
    );
}

/* Database Initialization */

async function initDatabase() {
    const saved =
        loadSavedDatabase();
    if (saved) {
        db =
            new SQL.Database(
                saved
            );
    } else {
        db =
            new SQL.Database();
    }
    db.run(
        "PRAGMA foreign_keys = ON"
    );

    /* Club*/

    db.run(`
        CREATE TABLE IF NOT EXISTS Club (
            club_id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL CHECK (category IN ('Technical','Cultural','Sports','Social','Literary')
                ),
            faculty_coordinator TEXT NOT NULL,
            established_year INTEGER CHECK (established_year BETWEEN 1950 AND 2100
                )
        )
    `);

    /* Memeber */
    db.run(`
        CREATE TABLE IF NOT EXISTS Member (
            member_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            department TEXT NOT NULL,
            study_year INTEGER CHECK (study_year BETWEEN 1 AND 4),
            phone TEXT
        )
    `);

    /* Event */
    db.run(`
        CREATE TABLE IF NOT EXISTS Event (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER NOT NULL REFERENCES Club(club_id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            event_date TEXT NOT NULL,
            venue TEXT NOT NULL,
            budget REAL DEFAULT 0 CHECK (budget >= 0)
        )
    `);

    /* MEMBERSHIP  */

    db.run(`
        CREATE TABLE IF NOT EXISTS Membership (
            membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id
                INTEGER NOT NULL
                REFERENCES Club(club_id)
                ON DELETE CASCADE,

            member_id
                INTEGER NOT NULL
                REFERENCES Member(member_id)
                ON DELETE CASCADE,

            role
                TEXT NOT NULL
                DEFAULT 'Member'
                CHECK (
                    role IN (
                        'President',
                        'Vice President',
                        'Secretary',
                        'Treasurer',
                        'Member'
                    )
                ),

            join_date
                TEXT NOT NULL,

            UNIQUE (
                club_id,
                member_id
            )
        )
    `);


    /* ================= USER ================= */

    db.run(`
        CREATE TABLE IF NOT EXISTS UserAccount (

            user_id
                INTEGER PRIMARY KEY AUTOINCREMENT,

            full_name
                TEXT NOT NULL,

            email
                TEXT NOT NULL UNIQUE,

            password_hash
                TEXT NOT NULL,

            created_at
                TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);


    await createDemoUser();

    createSampleData();

    persist();
}


/* =========================================================
   DEMO USER
========================================================= */

async function createDemoUser() {

    const count =
        scalar(
            "SELECT COUNT(*) FROM UserAccount"
        );


    if (Number(count) > 0) {

        return;
    }


    const password =
        await hashPassword(
            "admin123"
        );


    db.run(
        `
        INSERT INTO UserAccount
        (
            full_name,
            email,
            password_hash
        )
        VALUES (?, ?, ?)
        `,
        [
            "Administrator",
            "admin@clubsphere.com",
            password
        ]
    );


    persist();
}


/* =========================================================
   SAMPLE DATA
========================================================= */

function createSampleData() {

    const clubCount =
        Number(
            scalar(
                "SELECT COUNT(*) FROM Club"
            )
        );
    if (clubCount > 0) {
        return;
    }
    const clubs = [
        [
            "Coding Club",
            "Technical",
            "Dr. Meera Iyer",
            2015
        ],
        [
            "Robotics Club",
            "Technical",
            "Prof. Anil Kulkarni",
            2017
        ],
        [
            "Music Society",
            "Cultural",
            "Prof. Sunita Rao",
            2012
        ],
        [
            "Dance Crew",
            "Cultural",
            "Dr. Kavita Desai",
            2014
        ],
        [
            "Cricket Club",
            "Sports",
            "Prof. Rajesh Patil",
            2010
        ],
        [
            "Literary Circle",
            "Literary",
            "Dr. Neha Joshi",
            2013
        ],
        [
            "Photography Club",
            "Cultural",
            "Prof. Vikram Nair",
            2016
        ],
        [
            "Social Service League",
            "Social",
            "Dr. Anjali Mehta",
            2011
        ]
    ];
    clubs.forEach(
        club => {
            db.run(
                `
                INSERT INTO Club
                (
                    club_name,
                    category,
                    faculty_coordinator,
                    established_year
                )
                VALUES (?, ?, ?, ?)
                `,
                club
            );
        }
    );
    const members = [
        [
            "Aarav Sharma",
            "aarav.sharma@college.edu",
            "Computer Engineering",
            3,
            "9820000001"
        ],

        [
            "Diya Patel",
            "diya.patel@college.edu",
            "Information Technology",
            2,
            "9820000002"
        ],

        [
            "Rohan Mehta",
            "rohan.mehta@college.edu",
            "Computer Engineering",
            4,
            "9820000003"
        ],

        [
            "Sneha Nair",
            "sneha.nair@college.edu",
            "Electronics",
            3,
            "9820000004"
        ],

        [
            "Karan Singh",
            "karan.singh@college.edu",
            "Mechanical",
            2,
            "9820000005"
        ],

        [
            "Ishita Rao",
            "ishita.rao@college.edu",
            "Information Technology",
            1,
            "9820000006"
        ],

        [
            "Vivaan Joshi",
            "vivaan.joshi@college.edu",
            "Civil",
            4,
            "9820000007"
        ],

        [
            "Ananya Desai",
            "ananya.desai@college.edu",
            "Computer Engineering",
            2,
            "9820000008"
        ],

        [
            "Arjun Kulkarni",
            "arjun.kulkarni@college.edu",
            "Electronics",
            1,
            "9820000009"
        ],

        [
            "Meera Iyer",
            "meera.iyer@college.edu",
            "Information Technology",
            3,
            "9820000010"
        ],

        [
            "Yash Gupta",
            "yash.gupta@college.edu",
            "Mechanical",
            4,
            "9820000011"
        ],

        [
            "Priya Verma",
            "priya.verma@college.edu",
            "Civil",
            2,
            "9820000012"
        ]
    ];

    members.forEach(
        member => {

            db.run(
                `
                INSERT INTO Member
                (
                    full_name,
                    email,
                    department,
                    study_year,
                    phone
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                member
            );
        }
    );

    const memberships = [
        [1, 1, "President", "2025-07-05"],
        [1, 2, "Vice President", "2025-07-06"],
        [1, 3, "Member", "2025-07-10"],
        [2, 4, "President", "2025-07-12"],
        [2, 1, "Member", "2025-08-01"],
        [3, 5, "President", "2025-07-15"],
        [3, 6, "Secretary", "2025-07-20"],
        [4, 7, "President", "2025-08-02"],
        [5, 8, "President", "2025-08-05"],
        [5, 9, "Member", "2025-08-10"],
        [6, 10, "President", "2025-08-12"],
        [6, 5, "Treasurer", "2025-08-14"],
        [7, 11, "President", "2025-08-18"],
        [8, 12, "President", "2025-08-20"],
        [8, 2, "Member", "2025-08-25"]
    ];


    memberships.forEach(
        row => {
            db.run(
                `
                INSERT INTO Membership
                (
                    club_id,
                    member_id,
                    role,
                    join_date
                )
                VALUES (?, ?, ?, ?)
                `,
                row
            );
        }
    );

    const events = [
        [
            1,
            "Hackathon 2026",
            "2026-09-12",
            "Main Auditorium",
            25000
        ],
        [
            1,
            "Python Workshop",
            "2026-10-25",
            "Computer Lab 2",
            5000
        ],
        [
            2,
            "RoboWars",
            "2026-11-08",
            "Sports Complex",
            40000
        ],
        [
            2,
            "Arduino Bootcamp",
            "2026-10-30",
            "Electronics Lab",
            8000
        ],
        [
            3,
            "Battle of Bands",
            "2026-11-15",
            "Open Air Theatre",
            30000
        ],
        [
            3,
            "Unplugged Evening",
            "2026-12-05",
            "Seminar Hall",
            12000
        ],
        [
            4,
            "Annual Dance Fest",
            "2026-12-12",
            "Main Auditorium",
            35000
        ],
        [
            5,
            "Inter-College Cricket Cup",
            "2026-11-20",
            "College Ground",
            50000
        ],
        [
            6,
            "Poetry Slam",
            "2026-10-22",
            "Library Hall",
            4000
        ],
        [
            7,
            "Photo Walk",
            "2026-10-18",
            "City Heritage Area",
            3000
        ],
        [
            8,
            "Blood Donation Camp",
            "2026-11-02",
            "Health Centre",
            6000
        ],
        [
            8,
            "Tree Plantation Drive",
            "2026-11-28",
            "Campus Hill",
            2500
        ]
    ];
    events.forEach(
        event => {
            db.run(
                `
                INSERT INTO Event
                (
                    club_id,
                    title,
                    event_date,
                    venue,
                    budget
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                event
            );
        }
    );
    persist();
}


/*
   PASSWORD HASH
*/

async function hashPassword(
    password
) {
    if (
        window.crypto &&
        window.crypto.subtle
    ) {
        const encoder =
            new TextEncoder();
        const data =
            encoder.encode(
                password
            );
        const hash =
            await crypto.subtle.digest(
                "SHA-256",
                data
            );
        return Array
            .from(
                new Uint8Array(hash)
            )
            .map(
                byte =>
                    byte
                        .toString(16)
                        .padStart(2, "0")
            )
            .join("");
    }

    let hash = 0;
    for (
        let i = 0;
        i < password.length;
        i++
    ) {
        hash =
            (
                (
                    hash << 5
                ) -
                hash +
                password.charCodeAt(i)
            ) |
            0;
    }
    return String(hash);
}

/* 
   AUTHENTICATION
 */

async function createAccount() {

    const name =
        document
            .getElementById(
                "registerName"
            )
            .value
            .trim();


    const email =
        document
            .getElementById(
                "registerEmail"
            )
            .value
            .trim()
            .toLowerCase();


    const password =
        document
            .getElementById(
                "registerPassword"
            )
            .value;


    const confirm =
        document
            .getElementById(
                "registerConfirmPassword"
            )
            .value;


    if (
        !name ||
        !email ||
        !password ||
        !confirm
    ) {
        authMessage(
            "Please fill all fields.",
            "error",
            "registerMessage"
        );
        return;
    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email)
    ) {
        authMessage(
            "Please enter a valid email address.",
            "error",
            "registerMessage"
        );
        return;
    }


    if (
        password.length < 6
    ) {
        authMessage(
            "Password must contain at least 6 characters.",
            "error",
            "registerMessage"
        );
        return;
    }


    if (
        password !== confirm
    ) {
        authMessage(
            "Passwords do not match.",
            "error",
            "registerMessage"
        );
        return;
    }


    try {
        const existing =
            query(
                `
                SELECT user_id
                FROM UserAccount
                WHERE email = ?
                `,
                [email]
            );
        if (
            existing.rows.length
        ) {
            authMessage(
                "An account with this email already exists.",
                "error",
                "registerMessage"
            );
            return;
        }
        const passwordHash =
            await hashPassword(
                password
            );
        exec(
            `
            INSERT INTO UserAccount
            (
                full_name,
                email,
                password_hash
            )
            VALUES (?, ?, ?)
            `,
            [
                name,
                email,
                passwordHash
            ]
        );
        authMessage(
            "Account created successfully. Please sign in.",
            "success",
            "registerMessage"
        );
        document
            .getElementById(
                "registerName"
            )
            .value = "";
        document
            .getElementById(
                "registerEmail"
            )
            .value = "";
        document
            .getElementById(
                "registerPassword"
            )
            .value = "";
        document
            .getElementById(
                "registerConfirmPassword"
            )
            .value = "";
        setTimeout(
            showLogin,
            1000
        )
    } catch (error) {

        showError(error);
    }
}

async function signIn() {

    const email =
        document
            .getElementById(
                "loginEmail"
            )
            .value
            .trim()
            .toLowerCase();
    const password =
        document
            .getElementById(
                "loginPassword"
            )
            .value;
    if (
        !email ||
        !password
    ) {
        authMessage(
            "Please enter email and password.",
            "error",
            "authMessage"
        );
        return;
    }
    try {
        const passwordHash =
            await hashPassword(
                password
            );
        const result =
            query(
                `
                SELECT
                    user_id,
                    full_name,
                    email
                FROM UserAccount
                WHERE email = ?
                AND password_hash = ?
                `,
                [
                    email,
                    passwordHash
                ]
            );
        if (
            !result.rows.length
        ) {
            authMessage(
                "Invalid email or password.",
                "error",
                "authMessage"
            );
            return;
        }
        currentUser = {
            id:
                result.rows[0][0],
            name:
                result.rows[0][1],
            email:
                result.rows[0][2]
        };

        sessionStorage.setItem(
            "clubSphereUser",
            JSON.stringify(
                currentUser
            )
        );

        showApplication();
    } catch (error) {
        showError(error);
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem(
        "clubSphereUser"
    );

    document
        .getElementById(
            "loginEmail"
        )
        .value = "";


    document
        .getElementById(
            "loginPassword"
        )
        .value = "";


    showAuthScreen();
}


function checkSession() {

    try {

        const saved =
            sessionStorage.getItem(
                "clubSphereUser"
            );


        if (saved) {

            currentUser =
                JSON.parse(
                    saved
                );

            showApplication();

            return;
        }

    } catch (error) {

        console.warn(
            "Session restore failed."
        );
    }


    showAuthScreen();
}


function showApplication() {

    document.body
        .classList
        .remove(
            "logged-out"
        );


    document
        .getElementById(
            "authScreen"
        )
        .style.display = "none";


    document
        .getElementById(
            "currentUserName"
        )
        .textContent =
            currentUser
                ? currentUser.name
                : "";


    goToPage(
        "home"
    );
}


function showAuthScreen() {

    document.body
        .classList
        .add(
            "logged-out"
        );


    document
        .getElementById(
            "authScreen"
        )
        .style.display = "flex";


    showLogin();
}


function showLogin() {

    document
        .getElementById(
            "loginBox"
        )
        .style.display = "block";


    document
        .getElementById(
            "registerBox"
        )
        .style.display = "none";


    clearAuthMessages();
}


function showRegister() {

    document
        .getElementById(
            "loginBox"
        )
        .style.display = "none";


    document
        .getElementById(
            "registerBox"
        )
        .style.display = "block";


    clearAuthMessages();
}


function authMessage(
    message,
    type,
    elementId
) {

    const element =
        document.getElementById(
            elementId
        );


    element.textContent =
        message;

    element.className =
        "auth-message " + type;
}


function clearAuthMessages() {

    document
        .getElementById(
            "authMessage"
        )
        .textContent = "";


    document
        .getElementById(
            "registerMessage"
        )
        .textContent = "";
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        char =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char])
    );
}


/* =========================================================
   TABLE RENDERER
========================================================= */

function renderTable(
    container,
    result,
    onRowClick
) {

    const state =
        container._sort ||
        (
            container._sort = {
                col: -1,
                dir: 1
            }
        );


    let rows =
        result.rows.slice();


    if (
        state.col >= 0
    ) {

        rows.sort(
            (a, b) => {

                const x =
                    a[state.col];

                const y =
                    b[state.col];


                if (x == null)
                    return 1;

                if (y == null)
                    return -1;


                if (
                    typeof x === "number" &&
                    typeof y === "number"
                ) {

                    return (
                        x - y
                    ) * state.dir;
                }


                return String(x)
                    .localeCompare(
                        String(y),
                        undefined,
                        {
                            numeric: true
                        }
                    )
                    * state.dir;
            }
        );
    }


    let html =
        "<table><thead><tr>";


    result.cols.forEach(
        (column, index) => {

            const className =
                state.col === index
                    ? (
                        state.dir === 1
                            ? "sorted-asc"
                            : "sorted-desc"
                    )
                    : "";


            html += `
                <th
                    data-i="${index}"
                    class="${className}"
                >
                    ${esc(column)}
                </th>
            `;
        }
    );


    html +=
        "</tr></thead><tbody>";


    if (!rows.length) {

        html += `
            <tr>
                <td
                    class="empty"
                    colspan="${result.cols.length || 1}"
                >
                    No records found
                </td>
            </tr>
        `;
    }


    rows.forEach(
        row => {

            html += `
                <tr data-id="${esc(row[0])}">
                    ${
                        row.map(
                            value =>
                                `<td>${esc(value)}</td>`
                        ).join("")
                    }
                </tr>
            `;
        }
    );


    html +=
        "</tbody></table>";


    container.innerHTML =
        html;


    container
        .querySelectorAll("th")
        .forEach(
            th => {

                th.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                th.dataset.i
                            );


                        if (
                            state.col === index
                        ) {

                            state.dir *= -1;

                        } else {

                            state.col =
                                index;

                            state.dir =
                                1;
                        }


                        renderTable(
                            container,
                            result,
                            onRowClick
                        );
                    }
                );
            }
        );


    if (onRowClick) {

        container
            .querySelectorAll(
                "tbody tr[data-id]"
            )
            .forEach(
                row => {

                    row.addEventListener(
                        "click",
                        () => {

                            container
                                .querySelectorAll(
                                    "tr.selected"
                                )
                                .forEach(
                                    selected =>
                                        selected
                                            .classList
                                            .remove(
                                                "selected"
                                            )
                                );


                            row
                                .classList
                                .add(
                                    "selected"
                                );


                            onRowClick(
                                Number(
                                    row.dataset.id
                                )
                            );
                        }
                    );
                }
            );
    }
}


/* =========================================================
   FIELD CLASS - FIXED
========================================================= */

class Field {

    constructor(
        name,
        label,
        type = "text",
        options = {}
    ) {

        this.name = name;
        this.label = label;
        this.type = type;

        this.required =
            options.required ?? false;

        this.fkSql =
            options.fkSql || null;


        /*
           IMPORTANT FIX:

           Foreign-key fields use SELECT,
           not INPUT.

           This fixes:
           "this.el.add is not a function"
        */

        if (
            type === "fk"
        ) {

            this.el =
                document.createElement(
                    "select"
                );

            this.el.className =
                "field-input";

            return;
        }


        /* Choice fields */

        if (
            type === "choice"
        ) {

            this.el =
                document.createElement(
                    "select"
                );


            (
                options.values || []
            ).forEach(
                value => {

                    this.el.appendChild(
                        new Option(
                            value,
                            value
                        )
                    );
                }
            );


            this.el.className =
                "field-input";

            return;
        }


        /* Normal fields */

        this.el =
            document.createElement(
                "input"
            );


        if (
            type === "date"
        ) {

            this.el.type =
                "date";

        } else {

            this.el.type =
                type === "int" ||
                type === "dec"
                    ? "number"
                    : "text";
        }


        if (
            options.placeholder
        ) {

            this.el.placeholder =
                options.placeholder;
        }


        if (
            type === "int"
        ) {

            this.el.step =
                "1";
        }


        if (
            type === "dec"
        ) {

            this.el.step =
                "0.01";
        }


        this.el.className =
            "field-input";
    }


    reloadFk() {

        if (
            !this.fkSql ||
            this.el.tagName !== "SELECT"
        ) {

            return;
        }


        const previous =
            this.el.value;


        this.el.innerHTML =
            "";


        this.el.appendChild(
            new Option(
                "-- Select --",
                ""
            )
        );


        query(
            this.fkSql
        )
        .rows
        .forEach(
            row => {

                this.el.appendChild(
                    new Option(
                        row[1],
                        row[0]
                    )
                );
            }
        );


        if (
            previous !== ""
        ) {

            this.el.value =
                previous;
        }
    }


    get() {

        if (
            this.fkSql
        ) {

            if (
                !this.el.value
            ) {

                throw new Error(
                    `${this.label} is required.`
                );
            }


            return Number(
                this.el.value
            );
        }


        const raw =
            this.el.value;


        const value =
            typeof raw === "string"
                ? raw.trim()
                : raw;


        if (
            !value
        ) {

            if (
                this.required
            ) {

                throw new Error(
                    `${this.label} is required.`
                );
            }

            return null;
        }


        if (
            this.type === "int"
        ) {

            if (
                !/^-?\d+$/.test(
                    String(value)
                )
            ) {

                throw new Error(
                    `${this.label} must be a number.`
                );
            }


            return parseInt(
                value,
                10
            );
        }


        if (
            this.type === "dec"
        ) {

            const number =
                Number(value);


            if (
                Number.isNaN(number)
            ) {

                throw new Error(
                    `${this.label} must be a number.`
                );
            }


            return number;
        }


        return value;
    }


    setValue(value) {

        this.el.value =
            value == null
                ? ""
                : String(value);
    }


    clear() {

        if (
            this.el.tagName ===
            "SELECT"
        ) {

            if (
                this.el.options.length
            ) {

                this.el.selectedIndex =
                    0;
            }

        } else {

            this.el.value =
                "";
        }
    }
}


/* =========================================================
   CRUD PANEL
========================================================= */

class CrudPanel {

    constructor(
        root,
        title,
        table,
        pk,
        fields,
        listSql,
        searchColumns
    ) {

        this.root =
            root;

        this.title =
            title;

        this.table =
            table;

        this.pk =
            pk;

        this.fields =
            fields;

        this.listSql =
            listSql;

        this.searchColumns =
            searchColumns;

        this.selectedId =
            null;

        this.currentFilter =
            "";


        this.build();
    }


    build() {

        this.root.innerHTML = `

            <div class="page-title">

                <div>

                    <span class="section-label">
                        MANAGEMENT
                    </span>

                    <h2>
                        ${esc(this.title)}
                    </h2>

                    <p>
                        Add, update, search and manage
                        ${esc(
                            this.title.toLowerCase()
                        )}.
                    </p>

                </div>

            </div>


            <div class="crud">

                <div class="left">

                    <div class="toolbar">

                        <label>
                            Search ${esc(this.title)}
                        </label>

                        <input
                            type="text"
                            class="search"
                            placeholder="Search..."
                        >

                        <button
                            class="b-search primary-btn"
                        >
                            Search
                        </button>

                        <button
                            class="b-all outline-btn"
                        >
                            Show All
                        </button>

                    </div>


                    <div
                        class="table-wrap tall list"
                    ></div>

                </div>


                <fieldset>

                    <legend>
                        ${esc(this.title)} Details
                    </legend>

                    <div class="fields"></div>

                    <div class="btn-grid">

                        <button
                            class="primary b-add"
                        >
                            Add
                        </button>

                        <button
                            class="b-upd"
                        >
                            Update
                        </button>

                        <button
                            class="danger b-del"
                        >
                            Delete
                        </button>

                        <button
                            class="b-clr"
                        >
                            Clear
                        </button>

                    </div>

                    <div class="status"></div>

                </fieldset>

            </div>
        `;


        this.searchBox =
            this.root.querySelector(
                ".search"
            );


        this.listEl =
            this.root.querySelector(
                ".list"
            );


        this.statusEl =
            this.root.querySelector(
                ".status"
            );


        const fieldsContainer =
            this.root.querySelector(
                ".fields"
            );


        this.fields.forEach(
            field => {

                field.reloadFk();


                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "form-row";


                const label =
                    document.createElement(
                        "label"
                    );


                label.textContent =
                    field.label +
                    (
                        field.required
                            ? " *"
                            : ""
                    );


                row.append(
                    label,
                    field.el
                );


                fieldsContainer.append(
                    row
                );
            }
        );


        this.root
            .querySelector(
                ".b-search"
            )
            .onclick =
            () => {

                this.currentFilter =
                    this.searchBox
                        .value
                        .trim();

                this.refreshTable();
            };


        this.searchBox
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        this.currentFilter =
                            this.searchBox
                                .value
                                .trim();

                        this.refreshTable();
                    }
                }
            );


        this.root
            .querySelector(
                ".b-all"
            )
            .onclick =
            () => {

                this.searchBox.value =
                    "";

                this.currentFilter =
                    "";

                this.refreshTable();
            };


        this.root
            .querySelector(
                ".b-add"
            )
            .onclick =
            () => this.doInsert();


        this.root
            .querySelector(
                ".b-upd"
            )
            .onclick =
            () => this.doUpdate();


        this.root
            .querySelector(
                ".b-del"
            )
            .onclick =
            () => this.doDelete();


        this.root
            .querySelector(
                ".b-clr"
            )
            .onclick =
            () => this.clearForm();


        this.refreshTable();
    }


    refresh() {

        this.fields.forEach(
            field =>
                field.reloadFk()
        );


        this.refreshTable();
    }


    refreshTable() {

        try {

            let result;


            if (
                !this.currentFilter
            ) {

                result =
                    query(
                        this.listSql +
                        " ORDER BY 1"
                    );

            } else {

                const where =
                    this.searchColumns
                        .map(
                            column =>
                                `${column} LIKE ?`
                        )
                        .join(
                            " OR "
                        );


                const parameters =
                    this.searchColumns
                        .map(
                            () =>
                                `%${this.currentFilter}%`
                        );


                result =
                    query(
                        `
                        ${this.listSql}
                        WHERE ${where}
                        ORDER BY 1
                        `,
                        parameters
                    );
            }


            renderTable(
                this.listEl,
                result,
                id =>
                    this.selectRow(id)
            );


            this.statusEl.textContent =
                `${result.rows.length} record(s) found`;

        } catch (error) {

            showError(error);
        }
    }


    selectRow(id) {

        try {

            const result =
                query(
                    `
                    SELECT *
                    FROM ${this.table}
                    WHERE ${this.pk} = ?
                    `,
                    [id]
                );


            if (
                !result.rows.length
            ) {

                return;
            }


            const row =
                result.rows[0];


            const columns =
                result.cols;


            this.selectedId =
                id;


            this.fields.forEach(
                field => {

                    const index =
                        columns.indexOf(
                            field.name
                        );


                    if (
                        index >= 0
                    ) {

                        field.setValue(
                            row[index]
                        );
                    }
                }
            );


            this.statusEl.textContent =
                `Selected record ID ${id}.`;

        } catch (error) {

            showError(error);
        }
    }


    getValues() {

        const values = {};


        this.fields.forEach(
            field => {

                values[field.name] =
                    field.get();
            }
        );


        return values;
    }


    doInsert() {

        try {

            const values =
                this.getValues();


            const columns =
                Object.keys(
                    values
                );


            const placeholders =
                columns
                    .map(
                        () => "?"
                    )
                    .join(", ");


            exec(
                `
                INSERT INTO ${this.table}
                (
                    ${columns.join(", ")}
                )
                VALUES
                (
                    ${placeholders}
                )
                `,
                columns.map(
                    column =>
                        values[column]
                )
            );


            toast(
                `${this.title} added successfully.`
            );


            this.afterChange();

        } catch (error) {

            showError(error);
        }
    }


    doUpdate() {

        if (
            !this.selectedId
        ) {

            toast(
                "Select a record first.",
                "warn"
            );

            return;
        }


        try {

            const values =
                this.getValues();


            const columns =
                Object.keys(
                    values
                );


            const assignments =
                columns
                    .map(
                        column =>
                            `${column} = ?`
                    )
                    .join(", ");


            exec(
                `
                UPDATE ${this.table}
                SET ${assignments}
                WHERE ${this.pk} = ?
                `,
                [
                    ...columns.map(
                        column =>
                            values[column]
                    ),
                    this.selectedId
                ]
            );


            toast(
                `${this.title} updated successfully.`
            );


            this.afterChange();

        } catch (error) {

            showError(error);
        }
    }


    doDelete() {

        if (
            !this.selectedId
        ) {

            toast(
                "Select a record first.",
                "warn"
            );

            return;
        }


        const confirmDelete =
            confirm(
                `Delete selected ${this.title.toLowerCase()} record?`
            );


        if (
            !confirmDelete
        ) {

            return;
        }


        try {

            exec(
                `
                DELETE FROM ${this.table}
                WHERE ${this.pk} = ?
                `,
                [this.selectedId]
            );


            toast(
                `${this.title} deleted successfully.`
            );


            this.afterChange();

        } catch (error) {

            showError(error);
        }
    }


    afterChange() {

        this.clearForm();

        this.refreshTable();

        refreshAll();
    }


    clearForm() {

        this.selectedId =
            null;


        this.fields.forEach(
            field =>
                field.clear()
        );


        this.statusEl.textContent =
            "Ready.";

        this.listEl
            .querySelectorAll(
                "tr.selected"
            )
            .forEach(
                row =>
                    row.classList.remove(
                        "selected"
                    )
            );
    }
}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function goToPage(
    pageName
) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(
            page => {

                page.classList.remove(
                    "active"
                );
            }
        );


    const target =
        document.getElementById(
            `page-${pageName}`
        );


    if (
        target
    ) {

        target.classList.add(
            "active"
        );
    }


    document
        .querySelectorAll(
            ".nav-link"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                        pageName
                );
            }
        );


    if (
        pageName === "dashboard"
    ) {

        Dashboard.refresh();
    }


    if (
        pageName === "home"
    ) {

        Home.refresh();
    }


    if (
        pageName === "reports"
    ) {

        Reports.run();
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

const Dashboard = {

    build() {

        const container =
            document.getElementById(
                "dashboardCards"
            );


        const cards = [

            [
                "Total Clubs",
                "0"
            ],

            [
                "Total Members",
                "0"
            ],

            [
                "Memberships",
                "0"
            ],

            [
                "Upcoming Events",
                "0"
            ],

            [
                "Total Budget",
                "₹0"
            ]
        ];


        container.innerHTML =
            cards
                .map(
                    (card, index) => `
                    <div class="card">

                        <div
                            class="val"
                            id="dashboardCard${index}"
                        >
                            ${card[1]}
                        </div>

                        <div class="lbl">
                            ${card[0]}
                        </div>

                    </div>
                    `
                )
                .join("");
    },


    refresh() {

        try {

            document
                .getElementById(
                    "dashboardCard0"
                )
                .textContent =
                    scalar(
                        "SELECT COUNT(*) FROM Club"
                    );


            document
                .getElementById(
                    "dashboardCard1"
                )
                .textContent =
                    scalar(
                        "SELECT COUNT(*) FROM Member"
                    );


            document
                .getElementById(
                    "dashboardCard2"
                )
                .textContent =
                    scalar(
                        "SELECT COUNT(*) FROM Membership"
                    );


            document
                .getElementById(
                    "dashboardCard3"
                )
                .textContent =
                    scalar(
                        `
                        SELECT COUNT(*)
                        FROM Event
                        WHERE event_date >= date('now')
                        `
                    );


            const budget =
                Number(
                    scalar(
                        `
                        SELECT COALESCE(
                            SUM(budget),
                            0
                        )
                        FROM Event
                        `
                    )
                );


            document
                .getElementById(
                    "dashboardCard4"
                )
                .textContent =
                    "₹" +
                    budget.toLocaleString(
                        "en-IN"
                    );


            renderTable(
                document.getElementById(
                    "upcoming"
                ),
                query(
                    `
                    SELECT
                        e.title AS Event,
                        c.club_name AS Club,
                        e.event_date AS Event_Date,
                        e.venue AS Venue

                    FROM Event e

                    JOIN Club c
                    ON c.club_id = e.club_id

                    WHERE
                        e.event_date >= date('now')

                    ORDER BY
                        e.event_date

                    LIMIT 10
                    `
                )
            );


            renderTable(
                document.getElementById(
                    "perClub"
                ),
                query(
                    `
                    SELECT
                        c.club_name AS Club,
                        COUNT(
                            m.membership_id
                        ) AS Members

                    FROM Club c

                    LEFT JOIN Membership m
                    ON m.club_id =
                        c.club_id

                    GROUP BY
                        c.club_id

                    ORDER BY
                        Members DESC
                    `
                )
            );

        } catch (error) {

            showError(error);
        }
    }
};


/* =========================================================
   HOME
========================================================= */

const Home = {

    refresh() {

        try {

            const clubs =
                scalar(
                    "SELECT COUNT(*) FROM Club"
                );


            const members =
                scalar(
                    "SELECT COUNT(*) FROM Member"
                );


            const memberships =
                scalar(
                    "SELECT COUNT(*) FROM Membership"
                );


            const events =
                scalar(
                    `
                    SELECT COUNT(*)
                    FROM Event
                    WHERE event_date >= date('now')
                    `
                );


            document
                .getElementById(
                    "heroClubs"
                )
                .textContent =
                    clubs;


            document
                .getElementById(
                    "heroMembers"
                )
                .textContent =
                    members;


            document
                .getElementById(
                    "heroEvents"
                )
                .textContent =
                    events;


            document
                .getElementById(
                    "homeClubCount"
                )
                .textContent =
                    clubs;


            document
                .getElementById(
                    "homeMemberCount"
                )
                .textContent =
                    members;


            document
                .getElementById(
                    "homeMembershipCount"
                )
                .textContent =
                    memberships;


            document
                .getElementById(
                    "homeEventCount"
                )
                .textContent =
                    events;

        } catch (error) {

            showError(error);
        }
    }
};


/* =========================================================
   CRUD PANELS
========================================================= */

let clubsPanel;
let membersPanel;
let eventsPanel;
let membershipsPanel;


/* ================= CLUBS ================= */

function buildClubs() {

    clubsPanel =
        new CrudPanel(

            document.getElementById(
                "page-clubs"
            ),

            "Clubs",

            "Club",

            "club_id",

            [

                new Field(
                    "club_name",
                    "Club Name",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "category",
                    "Category",
                    "choice",
                    {
                        required: true,

                        values: [
                            "Technical",
                            "Cultural",
                            "Sports",
                            "Social",
                            "Literary"
                        ]
                    }
                ),

                new Field(
                    "faculty_coordinator",
                    "Faculty Coordinator",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "established_year",
                    "Established Year",
                    "int",
                    {
                        required: true
                    }
                )
            ],

            `
            SELECT
                club_id AS ID,
                club_name AS Club_Name,
                category AS Category,
                faculty_coordinator AS Coordinator,
                established_year AS Established

            FROM Club
            `,

            [
                "CAST(club_id AS TEXT)",
                "club_name",
                "category",
                "faculty_coordinator",
                "CAST(established_year AS TEXT)"
            ]
        );
}


/* ================= MEMBERS ================= */

function buildMembers() {

    membersPanel =
        new CrudPanel(

            document.getElementById(
                "page-members"
            ),

            "Members",

            "Member",

            "member_id",

            [

                new Field(
                    "full_name",
                    "Full Name",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "email",
                    "Email",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "department",
                    "Department",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "study_year",
                    "Year of Study",
                    "int",
                    {
                        required: true
                    }
                ),

                new Field(
                    "phone",
                    "Phone",
                    "text"
                )
            ],

            `
            SELECT
                member_id AS ID,
                full_name AS Name,
                email AS Email,
                department AS Department,
                study_year AS Year,
                phone AS Phone

            FROM Member
            `,

            [
                "CAST(member_id AS TEXT)",
                "full_name",
                "email",
                "department",
                "CAST(study_year AS TEXT)",
                "phone"
            ]
        );
}


/* ================= EVENTS ================= */

function buildEvents() {

    eventsPanel =
        new CrudPanel(

            document.getElementById(
                "page-events"
            ),

            "Events",

            "Event",

            "event_id",

            [

                new Field(
                    "club_id",
                    "Club",
                    "fk",
                    {
                        required: true,

                        fkSql:
                            `
                            SELECT
                                club_id,
                                club_name
                            FROM Club
                            ORDER BY club_name
                            `
                    }
                ),

                new Field(
                    "title",
                    "Event Title",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "event_date",
                    "Event Date",
                    "date",
                    {
                        required: true
                    }
                ),

                new Field(
                    "venue",
                    "Venue",
                    "text",
                    {
                        required: true
                    }
                ),

                new Field(
                    "budget",
                    "Budget (Rs.)",
                    "dec"
                )
            ],

            `
            SELECT
                e.event_id AS ID,
                c.club_name AS Club,
                e.title AS Title,
                e.event_date AS Event_Date,
                e.venue AS Venue,
                e.budget AS Budget

            FROM Event e

            JOIN Club c
            ON c.club_id = e.club_id
            `,

            [
                "CAST(e.event_id AS TEXT)",
                "c.club_name",
                "e.title",
                "e.event_date",
                "e.venue",
                "CAST(e.budget AS TEXT)"
            ]
        );
}


/* ================= MEMBERSHIPS ================= */

/* =========================================================
   MEMBERSHIPS PANEL - TYPED CLUB AND MEMBER NAMES
========================================================= */

class MembershipPanel extends CrudPanel {

    fieldByName(name) {

        return this.fields.find(
            field =>
                field.name === name
        );
    }


    findClubId(clubName) {

        const result = query(
            `
            SELECT club_id
            FROM Club
            WHERE LOWER(club_name) = LOWER(?)
            LIMIT 1
            `,
            [clubName]
        );

        if (!result.rows.length) {

            throw new Error(
                `Club "${clubName}" was not found. Check the club name.`
            );
        }

        return result.rows[0][0];
    }


    findMemberId(memberName) {

        const result = query(
            `
            SELECT member_id
            FROM Member
            WHERE LOWER(full_name) = LOWER(?)
            LIMIT 1
            `,
            [memberName]
        );

        if (!result.rows.length) {

            throw new Error(
                `Member "${memberName}" was not found. Add the member on the Members page first.`
            );
        }

        return result.rows[0][0];
    }


    getValues() {

        const clubName =
            this.fieldByName("club_name").get();

        const memberName =
            this.fieldByName("member_name").get();

        return {
            club_id:
                this.findClubId(clubName),

            member_id:
                this.findMemberId(memberName),

            role:
                this.fieldByName("role").get(),

            join_date:
                this.fieldByName("join_date").get()
        };
    }


    selectRow(id) {

        try {

            const result = query(
                `
                SELECT
                    c.club_name,
                    m.full_name,
                    ms.role,
                    ms.join_date
                FROM Membership ms
                JOIN Club c
                    ON c.club_id = ms.club_id
                JOIN Member m
                    ON m.member_id = ms.member_id
                WHERE ms.membership_id = ?
                `,
                [id]
            );

            if (!result.rows.length) {
                return;
            }

            const [clubName, memberName, role, joinDate] =
                result.rows[0];

            this.selectedId = id;

            this.fieldByName("club_name").setValue(clubName);
            this.fieldByName("member_name").setValue(memberName);
            this.fieldByName("role").setValue(role);
            this.fieldByName("join_date").setValue(joinDate);

            this.statusEl.textContent =
                `Selected record ID ${id}.`;

        } catch (error) {

            showError(error);
        }
    }
}




function buildMemberships() {

    membershipsPanel =
        new MembershipPanel(

            document.getElementById(
                "page-memberships"
            ),

            "Memberships",

            "Membership",

            "membership_id",

            [

                new Field(
                    "club_name",
                    "Club Name",
                    "text",
                    {
                        required: true,
                        placeholder: "Type club name"
                    }
                ),

                new Field(
                    "member_name",
                    "Member Name",
                    "text",
                    {
                        required: true,
                        placeholder: "Type member name"
                    }
                ),

                new Field(
                    "role",
                    "Role",
                    "choice",
                    {
                        required: true,

                        values: [
                            "Member",
                            "President",
                            "Vice President",
                            "Secretary",
                            "Treasurer"
                        ]
                    }
                ),

                new Field(
                    "join_date",
                    "Join Date",
                    "date",
                    {
                        required: true
                    }
                )
            ],

            `
            SELECT
                ms.membership_id AS ID,
                c.club_name AS Club,
                m.full_name AS Member,
                ms.role AS Role,
                ms.join_date AS Join_Date

            FROM Membership ms

            JOIN Club c
            ON c.club_id =
                ms.club_id

            JOIN Member m
            ON m.member_id =
                ms.member_id
            `,

            [
                "CAST(ms.membership_id AS TEXT)",
                "c.club_name",
                "m.full_name",
                "ms.role",
                "ms.join_date"
            ]
        );
}

/* =========================================================
   REPORTS
========================================================= */

const Reports = {

    lastResult: null,


    queries: {

        clubMembers: `
            SELECT
                c.club_name AS Club,
                COUNT(m.membership_id) AS Members
            FROM Club c
            LEFT JOIN Membership m
                ON m.club_id = c.club_id
            GROUP BY c.club_id, c.club_name
            ORDER BY Members DESC, Club
        `,

        upcomingEvents: `
            SELECT
                e.title AS Event,
                c.club_name AS Club,
                e.event_date AS Event_Date,
                e.venue AS Venue,
                e.budget AS Budget
            FROM Event e
            JOIN Club c
                ON c.club_id = e.club_id
            WHERE e.event_date >= date('now', 'localtime')
            ORDER BY e.event_date
        `,

        memberList: `
            SELECT
                member_id AS ID,
                full_name AS Name,
                email AS Email,
                department AS Department,
                study_year AS Year,
                phone AS Phone
            FROM Member
            ORDER BY full_name
        `,

        eventBudget: `
            SELECT
                c.club_name AS Club,
                COUNT(e.event_id) AS Events,
                COALESCE(SUM(e.budget), 0) AS Total_Budget
            FROM Club c
            LEFT JOIN Event e
                ON e.club_id = c.club_id
            GROUP BY c.club_id, c.club_name
            ORDER BY Total_Budget DESC, Club
        `,

        clubSummary: `
            SELECT
                c.club_id AS ID,
                c.club_name AS Club,
                c.category AS Category,
                c.faculty_coordinator AS Coordinator,
                c.established_year AS Established,
                COUNT(m.membership_id) AS Members
            FROM Club c
            LEFT JOIN Membership m
                ON m.club_id = c.club_id
            GROUP BY c.club_id, c.club_name
            ORDER BY c.club_name
        `
    },


    run() {

        const key =
            document.getElementById("reportPick").value;

        const sql =
            this.queries[key];

        const box =
            document.getElementById("reportResult");

        const info =
            document.getElementById("reportInfo");


        try {

            const result = query(sql);

            this.lastResult = result;

            box._sort = null;

            renderTable(box, result);

            info.textContent =
                `${result.rows.length} record(s) generated.`;

        } catch (error) {

            this.lastResult = null;

            box.innerHTML = "";

            info.textContent =
                "Report failed: " +
                (error.message || error);

            console.error(
                "Report error:",
                error
            );
        }
    }
};


function exportCSV() {

    if (
        !Reports.lastResult
    ) {

        toast(
            "Generate a report first.",
            "warn"
        );

        return;
    }


    const result =
        Reports.lastResult;


    const escapeCSV =
        value => {

            const text =
                String(
                    value ?? ""
                );


            return `"${text.replace(
                /"/g,
                '""'
            )}"`;
        };


    let csv =
        result.cols
            .map(
                escapeCSV
            )
            .join(",") +
        "\n";


    result.rows.forEach(
        row => {

            csv +=
                row
                    .map(
                        escapeCSV
                    )
                    .join(",") +
                "\n";
        }
    );


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        "clubsphere_report.csv";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    toast(
        "Report exported successfully."
    );
}



/* =========================================================
   REFRESH EVERYTHING
========================================================= */

function refreshAll() {

    Home.refresh();

    Dashboard.refresh();

    if (
        clubsPanel
    )
        clubsPanel.refreshTable();


    if (
        membersPanel
    )
        membersPanel.refreshTable();


    if (
        eventsPanel
    )
        eventsPanel.refreshTable();


    if (
        membershipsPanel
    )
        membershipsPanel.refreshTable();
}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        goToPage(
                            button.dataset.page
                        );
                    }
                );
            }
        );
}


/* =========================================================
   APPLICATION START
========================================================= */

async function startApplication() {

    try {

        SQL =
            await initSqlJs({

                locateFile:
                    file =>
                        "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/" +
                        file

            });


        await initDatabase();


        Dashboard.build();


        buildClubs();

        buildMembers();

        buildEvents();

        buildMemberships();


        setupNavigation();


        document
            .getElementById(
                "showRegisterBtn"
            )
            .addEventListener(
                "click",
                showRegister
            );


        document
            .getElementById(
                "showLoginBtn"
            )
            .addEventListener(
                "click",
                showLogin
            );


        document
            .getElementById(
                "loginButton"
            )
            .addEventListener(
                "click",
                signIn
            );


        document
            .getElementById(
                "registerButton"
            )
            .addEventListener(
                "click",
                createAccount
            );


        document
            .getElementById(
                "logoutBtn"
            )
            .addEventListener(
                "click",
                logout
            );


        document
            .getElementById(
                "reportRun"
            )
            .addEventListener(
                "click",
                () =>
                    Reports.run()
            );


        document
            .getElementById(
                "reportExport"
            )
            .addEventListener(
                "click",
                exportCSV
            );


        document
            .getElementById(
                "reportPick"
            )
            .addEventListener(
                "change",
                () =>
                    Reports.run()
            );


        document
            .getElementById(
                "loginPassword"
            )
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        signIn();
                    }
                }
            );


        document
            .getElementById(
                "registerConfirmPassword"
            )
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        createAccount();
                    }
                }
            );


        Home.refresh();

        Dashboard.refresh();

        Reports.run();

        checkSession();


    } catch (error) {

        console.error(
            error
        );

        document.body.innerHTML = `

            <div style="
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                font-family:Arial;
                background:#f8fafc;
            ">

                <div style="
                    background:white;
                    padding:35px;
                    border-radius:15px;
                    box-shadow:0 10px 40px rgba(0,0,0,.1);
                    max-width:500px;
                ">

                    <h2>
                        ClubSphere could not start
                    </h2>

                    <p>
                        ${esc(error.message)}
                    </p>

                    <p>
                        Please check your internet connection
                        because sql.js is loaded from CDN.
                    </p>

                </div>

            </div>
        `;
    }
}


/* =========================================================
   START
========================================================= */

startApplication();