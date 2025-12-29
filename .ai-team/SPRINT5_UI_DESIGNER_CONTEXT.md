# Sprint 5: UI Designer Context - Clerk Authentication Integration

## Your Mission
Integrate Clerk authentication into the Litplan iOS app, replacing the existing iCloud/Apple Sign-In implementation with Clerk's multi-provider auth flow (Google, Apple, Email/Password).

## Current State
- **Auth**: Custom Sign in with Apple / iCloud integration
- **Entry Point**: App opens directly to main content
- **Profile**: Shows iCloud user info

## Target State
- **Auth**: Clerk (Google, Apple, Email/Password)
- **Entry Point**: Auth check → Sign In screen if needed → Main app
- **Profile**: Shows Clerk user info (name, email, photo)

---

## Phase 1: Clerk iOS SDK Setup (Day 1)

### Task 1.1: Add Clerk iOS Package
Add to `Package.swift` or via Xcode:
```swift
.package(url: "https://github.com/clerk/clerk-ios", from: "1.0.0")
```

Or via CocoaPods:
```ruby
pod 'Clerk', '~> 1.0'
```

### Task 1.2: Configure Clerk
Create `ClerkConfig.swift`:
```swift
import Clerk

struct ClerkConfig {
    static let publishableKey = "pk_test_..." // From Clerk Dashboard

    static func configure() {
        Clerk.shared.configure(publishableKey: publishableKey)
    }
}
```

### Task 1.3: Update App Entry Point
Modify `LitplanApp.swift`:
```swift
import SwiftUI
import Clerk

@main
struct LitplanApp: App {
    init() {
        ClerkConfig.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
```

---

## Phase 2: Authentication Views (Days 2-3)

### Task 2.1: Create Root View with Auth Check
Create `RootView.swift`:
```swift
import SwiftUI
import Clerk

struct RootView: View {
    @ObservedObject private var clerk = Clerk.shared

    var body: some View {
        Group {
            if clerk.session != nil {
                // User is signed in
                MainTabView()
            } else {
                // User needs to sign in
                AuthView()
            }
        }
        .animation(.easeInOut, value: clerk.session)
    }
}
```

### Task 2.2: Create Authentication View
Create `Auth/AuthView.swift`:

```swift
import SwiftUI
import Clerk

struct AuthView: View {
    @State private var isShowingSignUp = false

    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Logo and Title
                VStack(spacing: 16) {
                    Image("LitplanLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)

                    Text("Litplan")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)

                    Text("Discover your perfect night out")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }

                Spacer()

                // Auth Buttons
                VStack(spacing: 16) {
                    // Sign in with Apple
                    SocialSignInButton(
                        provider: .apple,
                        title: "Continue with Apple"
                    )

                    // Sign in with Google
                    SocialSignInButton(
                        provider: .google,
                        title: "Continue with Google"
                    )

                    // Divider
                    HStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                        Text("or")
                            .font(.caption)
                            .foregroundColor(.gray)
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                    }
                    .padding(.vertical, 8)

                    // Email Sign In
                    NavigationLink(destination: EmailSignInView()) {
                        HStack {
                            Image(systemName: "envelope.fill")
                            Text("Continue with Email")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.2))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 24)

                // Terms
                Text("By continuing, you agree to our Terms of Service and Privacy Policy")
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 24)
            }
        }
        .navigationBarHidden(true)
    }
}
```

### Task 2.3: Create Social Sign-In Button Component
Create `Auth/Components/SocialSignInButton.swift`:

```swift
import SwiftUI
import Clerk

enum SocialProvider {
    case apple
    case google

    var icon: String {
        switch self {
        case .apple: return "apple.logo"
        case .google: return "g.circle.fill"
        }
    }

    var backgroundColor: Color {
        switch self {
        case .apple: return .white
        case .google: return .white
        }
    }

    var foregroundColor: Color {
        switch self {
        case .apple: return .black
        case .google: return .black
        }
    }
}

struct SocialSignInButton: View {
    let provider: SocialProvider
    let title: String

    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Button(action: signIn) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: provider.foregroundColor))
                } else {
                    Image(systemName: provider.icon)
                        .font(.title2)
                    Text(title)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(provider.backgroundColor)
            .foregroundColor(provider.foregroundColor)
            .cornerRadius(12)
        }
        .disabled(isLoading)
        .alert("Sign In Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func signIn() {
        isLoading = true

        Task {
            do {
                switch provider {
                case .apple:
                    try await Clerk.shared.signIn.create(strategy: .apple)
                case .google:
                    try await Clerk.shared.signIn.create(strategy: .google)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
```

### Task 2.4: Create Email Sign-In View
Create `Auth/EmailSignInView.swift`:

```swift
import SwiftUI
import Clerk

struct EmailSignInView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isShowingSignUp = false
    @State private var isShowingForgotPassword = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Sign In")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Enter your email and password")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.top, 40)

                Spacer()

                // Form
                VStack(spacing: 16) {
                    // Email field
                    TextField("Email", text: $email)
                        .textFieldStyle(DarkTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)

                    // Password field
                    SecureField("Password", text: $password)
                        .textFieldStyle(DarkTextFieldStyle())

                    // Forgot password
                    Button("Forgot Password?") {
                        isShowingForgotPassword = true
                    }
                    .font(.caption)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .padding(.horizontal, 24)

                Spacer()

                // Sign In Button
                VStack(spacing: 16) {
                    Button(action: signIn) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Sign In")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1)

                    // Sign Up link
                    Button("Don't have an account? Sign Up") {
                        isShowingSignUp = true
                    }
                    .font(.subheadline)
                    .foregroundColor(.gray)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "arrow.left")
                        .foregroundColor(.white)
                }
            }
        }
        .sheet(isPresented: $isShowingSignUp) {
            EmailSignUpView()
        }
        .sheet(isPresented: $isShowingForgotPassword) {
            ForgotPasswordView()
        }
        .alert("Sign In Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func signIn() {
        isLoading = true

        Task {
            do {
                try await Clerk.shared.signIn.create(
                    strategy: .password(email: email, password: password)
                )
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
```

### Task 2.5: Create Email Sign-Up View
Create `Auth/EmailSignUpView.swift`:

```swift
import SwiftUI
import Clerk

struct EmailSignUpView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var isFormValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 8
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 8) {
                            Text("Create Account")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.white)

                            Text("Join Litplan to discover the best nightlife")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 40)

                        // Form
                        VStack(spacing: 16) {
                            HStack(spacing: 12) {
                                TextField("First Name", text: $firstName)
                                    .textFieldStyle(DarkTextFieldStyle())

                                TextField("Last Name", text: $lastName)
                                    .textFieldStyle(DarkTextFieldStyle())
                            }

                            TextField("Email", text: $email)
                                .textFieldStyle(DarkTextFieldStyle())
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)

                            SecureField("Password (min 8 characters)", text: $password)
                                .textFieldStyle(DarkTextFieldStyle())

                            SecureField("Confirm Password", text: $confirmPassword)
                                .textFieldStyle(DarkTextFieldStyle())

                            if !confirmPassword.isEmpty && password != confirmPassword {
                                Text("Passwords don't match")
                                    .font(.caption)
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .padding(.horizontal, 24)

                        Spacer(minLength: 40)

                        // Sign Up Button
                        Button(action: signUp) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Create Account")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || !isFormValid)
                        .opacity(isFormValid ? 1 : 0.6)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.white)
                }
            }
        }
        .alert("Sign Up Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func signUp() {
        isLoading = true

        Task {
            do {
                try await Clerk.shared.signUp.create(
                    emailAddress: email,
                    password: password,
                    firstName: firstName,
                    lastName: lastName
                )
                // Clerk will handle email verification if enabled
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
```

---

## Phase 3: UI Components (Day 2)

### Task 3.1: Create Dark Text Field Style
Create `Auth/Components/DarkTextFieldStyle.swift`:

```swift
import SwiftUI

struct DarkTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.gray.opacity(0.2))
            .foregroundColor(.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
            )
    }
}
```

### Task 3.2: Create Forgot Password View
Create `Auth/ForgotPasswordView.swift`:

```swift
import SwiftUI
import Clerk

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var isSent = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    if isSent {
                        // Success state
                        VStack(spacing: 16) {
                            Image(systemName: "envelope.badge.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.green)

                            Text("Check Your Email")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)

                            Text("We sent a password reset link to \(email)")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)

                            Button("Done") { dismiss() }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .padding(.top, 24)
                        }
                        .padding(.horizontal, 40)
                    } else {
                        // Form state
                        VStack(spacing: 8) {
                            Text("Forgot Password")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.white)

                            Text("Enter your email to reset your password")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 40)

                        Spacer()

                        TextField("Email", text: $email)
                            .textFieldStyle(DarkTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .padding(.horizontal, 24)

                        Spacer()

                        Button(action: resetPassword) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Send Reset Link")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || email.isEmpty)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.white)
                }
            }
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func resetPassword() {
        isLoading = true

        Task {
            do {
                try await Clerk.shared.signIn.create(
                    strategy: .resetPasswordEmailCode(email: email)
                )
                isSent = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
```

---

## Phase 4: Profile Updates (Day 3)

### Task 4.1: Update Profile View
Modify `ProfileView.swift` to show Clerk user info:

```swift
import SwiftUI
import Clerk

struct ProfileView: View {
    @ObservedObject private var clerk = Clerk.shared

    private var user: ClerkUser? {
        clerk.user
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Header
                        VStack(spacing: 16) {
                            // Profile Image
                            if let imageUrl = user?.imageUrl,
                               let url = URL(string: imageUrl) {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .scaledToFill()
                                } placeholder: {
                                    Circle()
                                        .fill(Color.gray.opacity(0.3))
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            } else {
                                Circle()
                                    .fill(Color.red.opacity(0.2))
                                    .frame(width: 100, height: 100)
                                    .overlay(
                                        Text(user?.firstName?.prefix(1) ?? "?")
                                            .font(.largeTitle)
                                            .foregroundColor(.red)
                                    )
                            }

                            // Name
                            Text("\(user?.firstName ?? "") \(user?.lastName ?? "")")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)

                            // Email
                            Text(user?.primaryEmailAddress?.emailAddress ?? "")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 24)

                        Divider()
                            .background(Color.gray.opacity(0.3))

                        // Subscription Section
                        SubscriptionSectionView()

                        // Settings Section
                        SettingsSectionView()

                        // Sign Out Button
                        Button(action: signOut) {
                            Text("Sign Out")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.gray.opacity(0.2))
                                .foregroundColor(.red)
                                .cornerRadius(12)
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 24)
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func signOut() {
        Task {
            try? await clerk.signOut()
        }
    }
}
```

---

## Phase 5: API Integration (Day 4)

### Task 5.1: Update APIService
Modify `Services/APIService.swift` to include Clerk tokens:

```swift
import Foundation
import Clerk

class APIService {
    static let shared = APIService()

    private let baseURL = "https://your-api.com/api/v1"

    private var sessionToken: String? {
        return Clerk.shared.session?.getToken()
    }

    func makeRequest<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add Clerk authentication
        if let token = try await Clerk.shared.session?.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Handle 401 - trigger re-auth
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)
}
```

---

## Design Guidelines

### Colors (Litplan Theme)
```swift
extension Color {
    static let litplanBackground = Color.black
    static let litplanSurface = Color(white: 0.1)
    static let litplanAccent = Color.red
    static let litplanText = Color.white
    static let litplanTextSecondary = Color.gray
}
```

### Typography
- **Title**: System Bold, 32pt
- **Headline**: System Semibold, 20pt
- **Body**: System Regular, 16pt
- **Caption**: System Regular, 12pt

### Spacing
- **Section spacing**: 24pt
- **Element spacing**: 16pt
- **Small spacing**: 8pt
- **Horizontal padding**: 24pt

---

## Files to Create

```
ios-app/Litplan/
├── Auth/
│   ├── AuthView.swift
│   ├── EmailSignInView.swift
│   ├── EmailSignUpView.swift
│   ├── ForgotPasswordView.swift
│   ├── RootView.swift
│   └── Components/
│       ├── SocialSignInButton.swift
│       └── DarkTextFieldStyle.swift
├── Config/
│   └── ClerkConfig.swift
├── Services/
│   └── APIService.swift (updated)
└── Views/
    └── ProfileView.swift (updated)
```

---

## Testing Checklist

- [ ] App shows auth screen when not signed in
- [ ] Apple Sign-In works correctly
- [ ] Google Sign-In works correctly
- [ ] Email/Password sign-in works
- [ ] Email/Password sign-up works
- [ ] Password reset flow works
- [ ] Profile shows correct user info
- [ ] Sign out works correctly
- [ ] App returns to auth screen after sign out
- [ ] API calls include Clerk token
- [ ] 401 errors trigger re-auth flow

---

## Daily Log Template

```markdown
### UI Designer (Sprint 5 - Clerk Auth)
- **Date**: [Date]
- **Phase**: [1-5]

#### Tasks Completed:
-

#### Files Created/Modified:
-

#### Design Decisions:
-

#### Blockers:
-

#### Next Steps:
-
```

---

**Reference Documents**:
- Full migration plan: `SPRINT_5_PRISMA_CLERK_MIGRATION.md`
- Clerk iOS docs: https://clerk.com/docs/quickstarts/ios
- Design tokens: `design-tokens.json`
