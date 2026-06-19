import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class PromoteUserToAdmin {
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: PromoteUserToAdmin <username>");
            System.exit(2);
        }
        String username = args[0];
        try (Connection conn = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/ecommerce_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC",
                "root", "")) {
            try (PreparedStatement stmt = conn.prepareStatement("UPDATE users SET role='ADMIN' WHERE username=?")) {
                stmt.setString(1, username);
                int updated = stmt.executeUpdate();
                System.out.println("updated=" + updated);
            }
            try (PreparedStatement stmt = conn
                    .prepareStatement("SELECT id, username, email, role FROM users WHERE username=?")) {
                stmt.setString(1, username);
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        System.out.println(
                                rs.getLong(1) + "," + rs.getString(2) + "," + rs.getString(3) + "," + rs.getString(4));
                    }
                }
            }
        }
    }
}
