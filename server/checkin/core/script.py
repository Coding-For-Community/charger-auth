# from math import hypot
#
# x = "15.5+15.3+14.9+15+15.1+14.9+15+15.2+15.4+15.2+15.1+15.2".split("+")
# y = "10.5+10.6+10.1+10+10.2+9.9+9.6+10+9.9+10.1+10.1+9.8".split("+")
# x = [float(val) for val in x]
# y = [float(val) for val in y]
# mode = "regular"
# if mode == "regular":
#     x_mean = sum(x) / 12
#     y_mean = sum(y) / 12
#     x_std_dev = sum([(val - x_mean) ** 2 for val in x]) / 11
#     y_std_dev = sum([(val - y_mean) ** 2 for val in y]) / 11
#     print(f"X mean: {x_mean}; Y mean: {y_mean}, X Std dev: {x_std_dev}, Y Std dev: {y_std_dev}")
#
#     cor_estimate = (y_mean / x_mean) * 0.5
#     x_frac_uncertainty = x_std_dev / x_mean
#     y_frac_uncertainty = y_std_dev / y_mean
#     uncertainty = 0.5 * hypot(y_frac_uncertainty, x_frac_uncertainty)
#     print(f"COR estimate: {cor_estimate}")
#     print(f"COR uncertainty: {uncertainty}")
#     # 0.44 +- 0.016
# else:
#     # TODO likely bugged
#     sum_of_x = sum(x)
#     sum_of_y = sum(y)
#     sum_of_x_2 = sum([val ** 2 for val in x])
#     sum_of_xy = sum([float(x[i]) * float(y[i]) for i in range(12)])
#
#     val = 12 * sum_of_xy
#     val -= sum_of_x * sum_of_y
#     val /= (12 * sum_of_x_2 - sum_of_x ** 2)
#     print(val)
#
#     differences = [(y[i] - val * x[i]) ** 2 for i in range(12)]
#     print(differences)
#     sigma_y = (sum(differences) / (12 - 2)) ** 0.5
#     print(f"Y std dev: {sigma_y}")
#     delta = (12 * sum_of_x_2 - sum_of_x ** 2)
#     print(f"Delta: {delta}")
#     sigma_cof = sigma_y * (12 / delta) ** 0.5
#     print(f"COR : {sigma_cof}")
#
# # values = [i for i in range(3, 8)] + [9]
# # probs = [.14, .35, .06, .15, .21, .09]
# # mean = sum([values[i] * probs[i] for i in range(6)])
# # dev = sum([ (values[i] - mean) ** 2 * probs[i] for i in range(6) ]) ** 0.5
# # print(mean)
# # print(dev)
# # print(dev ** 2)
