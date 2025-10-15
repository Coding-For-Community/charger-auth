# x = "15.5+15.3+14.9+15+15.1+14.9+15+15.2+15.4+15.2+15.1+15.2".split("+")
# y = "10.5+10.6+10.1+10+10.2+9.9+9.6+10+9.9+10.1+10.1+9.8".split("+")
# x = [float(val) for val in x]
# y = [float(val) for val in y]
#
# print(x)
# print(y)
#
# sum_of_x = sum(x)
# sum_of_y = sum(y)
# sum_of_x_2 = sum([val ** 2 for val in x])
# sum_of_xy = sum([float(x[i]) * float(y[i]) for i in range(12)])
#
# # val = 12 * sum_of_xy
# # val -= sum_of_x * sum_of_y
# # val /= (12 * sum_of_x_2 - sum_of_x ** 2)
# # print(val)
#
# A = 0.7179487179499139
# differences = [(y[i] - A * x[i]) ** 2 for i in range(12)]
# sigma_y = (sum(differences) / 10) ** 0.5
# print(f"Y std dev: {sigma_y}")
# delta = (12 * sum_of_x_2 - sum_of_x ** 2)
# print(f"Delta: {delta}")
# sigma_cof = sigma_y * (12 / delta) ** 0.5
# print(f"Sigma Cof: {sigma_cof}")

hi = input("Some question")
if hi == "hello":
    print("hi")

# Apple is red and its sweetness is 90
apple = {
    "color": "red",
    "sweetness": 90
}

print(apple["color"])
print(apple["sweetness"])
